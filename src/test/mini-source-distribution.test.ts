import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..", "..");

async function workflowSources(): Promise<Array<{ path: string; source: string }>> {
	const directory = join(projectRoot, ".github", "workflows");
	const files = (await readdir(directory)).filter((path) => /\.ya?ml$/.test(path));
	return await Promise.all(
		files.map(async (path) => ({
			path,
			source: await Bun.file(join(directory, path)).text(),
		})),
	);
}

describe("source-only distribution", () => {
	it("marks the local package as private so npm cannot publish it", async () => {
		const pkg = await Bun.file(join(projectRoot, "package.json")).json();
		expect(pkg.private).toBe(true);
	});

	it("has no workflow path that publishes registry packages or release binaries", async () => {
		const workflows = await workflowSources();
		expect(workflows.length).toBeGreaterThan(0);
		for (const workflow of workflows) {
			expect(workflow.source, workflow.path).not.toContain("npm publish");
			expect(workflow.source, workflow.path).not.toContain("softprops/action-gh-release");
		}
	});

	it("validates a fork tag against the unchanged upstream-compatible package version", async () => {
		const pkg = await Bun.file(join(projectRoot, "package.json")).json();
		const valid = Bun.spawnSync([process.execPath, "scripts/validate-mini-tag.ts", `mini-v${pkg.version}`], {
			cwd: projectRoot,
			stderr: "pipe",
			stdout: "pipe",
		});
		expect(valid.exitCode).toBe(0);
		expect(valid.stdout.toString()).toContain(`mini-v${pkg.version}`);

		for (const invalidTag of [`v${pkg.version}`, `mini-v${pkg.version}.1`, "mini-v0.0.0"]) {
			const invalid = Bun.spawnSync([process.execPath, "scripts/validate-mini-tag.ts", invalidTag], {
				cwd: projectRoot,
				stderr: "pipe",
				stdout: "pipe",
			});
			expect(invalid.exitCode, invalidTag).toBe(1);
			expect(invalid.stderr.toString(), invalidTag).toContain(`Expected mini-v${pkg.version}`);
		}
	});

	it("runs ordinary CI for fork-specific source tags", async () => {
		const workflow = await Bun.file(join(projectRoot, ".github/workflows/ci.yml")).text();
		expect(workflow).toMatch(/push:\s*\n(?:\s+.*\n)*?\s+tags:\s*\[["']mini-v\*\.\*\.\*["']\]/);
	});
});
