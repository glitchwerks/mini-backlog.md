import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import { createMcpServer, McpServer } from "../mcp/server.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const miniCli = join(process.cwd(), "src/bin/cli.ts");

async function seedProject() {
	const dir = createUniqueTestDir("mini-indirect-preservation");
	const seed = new McpServer(dir, "Seed");
	await initializeFilesystemTestProject(seed, "Indirect preservation");
	await $`git init`.cwd(dir).quiet();
	const config = await seed.filesystem.loadConfig();
	if (!config) throw new Error("Missing fixture config");
	await seed.filesystem.saveConfig({
		...config,
		statuses: ["Draft", "To Do", "In Progress", "Done"],
		filesystemOnly: false,
		autoCommit: true,
		bypassGitHooks: true,
	});
	await seed.filesystem.createMilestone("Original");
	await seed.filesystem.createMilestone("Replacement");
	await seed.stop();
	return dir;
}

async function seedTask(dir: string, id: number, folder = "tasks", extra = "") {
	const path = `backlog/${folder}/task-${id} - fixture.md`;
	await Bun.write(
		join(dir, path),
		`---\nid: TASK-${id}\ntitle: Fixture ${id}\nstatus: ${folder === "completed" ? "Done" : "To Do"}\nassignee: []\nlabels: []\ncreated_date: '2026-09-15'\nfuture_extension:\n  nested: [one, two]\n${extra}---\n\n## Description\n\nFixture\n`,
	);
	return path;
}

async function assertPreserved(dir: string, paths: string[], committed: boolean) {
	for (const path of paths) {
		const contents = [await Bun.file(join(dir, path)).text()];
		if (committed)
			contents.push((await $`git show ${`HEAD:${path.replaceAll("\\", "/")}`}`.cwd(dir).quiet()).stdout.toString());
		for (const text of contents) {
			expect(text).toContain("future_extension:");
			expect(text).toContain("one");
			expect(text).toContain("two");
		}
	}
}

describe("mini indirect task preservation", () => {
	it.each([
		"rename",
		"clear",
		"reassign",
	])("preserves extensions in %s milestone writes and commits", async (operation) => {
		const dir = await seedProject();
		let server: McpServer | undefined;
		try {
			const path = await seedTask(dir, 1, "tasks", "milestone: Original\n");
			await $`git add .`.cwd(dir).quiet();
			await $`git commit -m baseline`.cwd(dir).quiet();
			server = await createMcpServer(dir, { surface: "mini" });
			const result = await server.testInterface.callTool({
				params:
					operation === "rename"
						? { name: "milestone_rename", arguments: { from: "m-0", to: "Renamed" } }
						: { name: "milestone_remove", arguments: { name: "m-0", taskHandling: operation, reassignTo: "m-1" } },
			});
			expect(result.isError).not.toBe(true);
			await assertPreserved(dir, [path], true);
			expect((await server.getTask("TASK-1"))?.milestone).toBe(
				operation === "clear" ? undefined : operation === "rename" ? "m-0" : "m-1",
			);
		} finally {
			await server?.stop();
			await safeCleanup(dir);
		}
	}, 20000);

	it.each(["milestone_rename", "milestone_remove"])("preserves extensions during %s rollback", async (name) => {
		const dir = await seedProject();
		let server: McpServer | undefined;
		try {
			const path = await seedTask(dir, 1, "tasks", "milestone: Original\n");
			await $`git add .`.cwd(dir).quiet();
			await $`git commit -m baseline`.cwd(dir).quiet();
			server = await createMcpServer(dir, { surface: "mini" });
			server.git.commitFiles = async () => {
				throw new Error("Injected commit failure");
			};
			const result = await server.testInterface.callTool({
				params: { name, arguments: name === "milestone_rename" ? { from: "m-0", to: "Renamed" } : { name: "m-0" } },
			});
			expect(result.isError).toBe(true);
			await assertPreserved(dir, [path], false);
			expect((await server.getTask("TASK-1"))?.milestone).toBe("Original");
		} finally {
			await server?.stop();
			await safeCleanup(dir);
		}
	}, 20000);

	it("preserves active and completed dependents during CLI Draft demotion and its commit", async () => {
		const dir = await seedProject();
		try {
			await seedTask(dir, 1);
			const paths = [
				await seedTask(dir, 2, "tasks", "dependencies: [TASK-1]\n"),
				await seedTask(dir, 3, "completed", "dependencies: [TASK-1]\n"),
			];
			await $`git add .`.cwd(dir).quiet();
			await $`git commit -m baseline`.cwd(dir).quiet();
			const result = await $`bun ${miniCli} task edit TASK-1 --status Draft`.cwd(dir).quiet().nothrow();
			expect(result.stderr.toString()).toBe("");
			expect(result.exitCode).toBe(0);
			await assertPreserved(dir, paths, true);
			for (const path of paths) expect(await Bun.file(join(dir, path)).text()).not.toContain("TASK-1");
			const drafts = await Array.fromAsync(new Bun.Glob("backlog/drafts/*.md").scan({ cwd: dir }));
			expect(drafts).toHaveLength(1);
			await assertPreserved(dir, drafts, true);
		} finally {
			await safeCleanup(dir);
		}
	}, 20000);
});
