import { expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
type Workflow = { jobs: Record<string, { steps: { name?: string; run?: string }[] }> };

it.each(["root", "platform"])("generates fork repository metadata in the %s release manifest", async (kind) => {
	const workflow = Bun.YAML.parse(await Bun.file(".github/workflows/release.yml").text()) as Workflow;
	const step = workflow.jobs[kind === "root" ? "npm-publish" : "publish-binaries"]?.steps.find(
		(step) => step.name === (kind === "root" ? "Create npm-ready package.json" : "Prepare package"),
	);
	const script = step?.run?.match(/node (scripts\/\S+) /)?.[1];
	if (!script) throw new Error("Missing manifest generation command");
	await mkdir(".tmp", { recursive: true });
	const dir = await mkdtemp(join(process.cwd(), ".tmp/mini-release-"));
	try {
		const output = join(dir, "package.json");
		await exec("node", [
			script,
			kind,
			output,
			"9.8.7",
			...(kind === "platform" ? ["backlog.md-windows-x64", "win32", "x64"] : []),
		]);
		const manifest = await Bun.file(output).json();
		expect(manifest.repository.url).toBe("git+https://github.com/glitchwerks/mini-backlog.md.git");
		expect(manifest.version).toBe("9.8.7");
		expect(manifest.name).toBe(kind === "root" ? "backlog.md" : "backlog.md-windows-x64");
		if (kind === "root") {
			expect(manifest.bin).toEqual({ backlog: "cli.js" });
			expect(Object.values(manifest.optionalDependencies)).toEqual(Array(6).fill("9.8.7"));
			expect(manifest.files).not.toContain("src/test/full-cli-entry.ts");
		} else {
			expect(manifest.files).toEqual(["backlog.exe", "package.json", "LICENSE"]);
		}
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
});
