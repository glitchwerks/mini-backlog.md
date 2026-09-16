import { expect, it } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { createMcpServer, McpServer } from "../mcp/server.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const cli = join(process.cwd(), "src/bin/cli.ts");
it("limits recovery guidance to mini commands and canonical options", async () => {
	const dir = await mkdtemp(join(tmpdir(), "mini-errors-"));
	const core = new McpServer(dir, "Seed");
	try {
		const uninitialized = await $`bun ${cli} task list`.cwd(dir).quiet().nothrow();
		expect(uninitialized.exitCode).toBe(1);
		expect(uninitialized.stderr.toString()).not.toContain("backlog init");
		await initializeFilesystemTestProject(core, "Mini errors");
		for (const operation of ["view", "complete"]) {
			const missing = await $`bun ${cli} task ${operation} TASK-999`.cwd(dir).quiet().nothrow();
			expect(missing.exitCode).toBe(1);
			expect(missing.stderr.toString()).toContain("not found");
			expect(missing.stderr.toString()).not.toContain("browser");
		}
		await $`bun ${cli} task create Pending`.cwd(dir).quiet();
		const pending = await $`bun ${cli} task complete TASK-1`.cwd(dir).quiet().nothrow();
		expect(pending.exitCode).toBe(1);
		expect(pending.stderr.toString()).toContain('--status "Done"');
		expect(pending.stderr.toString()).not.toMatch(/ -s |cleanup|archive/);
	} finally {
		await core.stop();
		await safeCleanup(dir);
	}
});

it("empty MCP task search advertises only accepted fields", async () => {
	const dir = createUniqueTestDir("mini-search-errors");
	const seed = new McpServer(dir, "Seed");
	await initializeFilesystemTestProject(seed, "Mini search");
	await seed.stop();
	const server = await createMcpServer(dir, { surface: "mini" });
	try {
		const result = await server.testInterface.callTool({ params: { name: "task_search", arguments: {} } });
		expect(result.isError).toBe(true);
		expect(JSON.stringify(result)).not.toMatch(/modifiedFiles|project filter/);
		expect(JSON.stringify(result)).toContain("query");
	} finally {
		await server.stop();
		await safeCleanup(dir);
	}
});
