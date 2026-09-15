import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(import.meta.dir, "../..");
let buildDirectory: string;
let executable: string;

describe("compiled mini CLI entry", () => {
	beforeAll(async () => {
		const scratchRoot = join(projectRoot, ".tmp");
		await mkdir(scratchRoot, { recursive: true });
		buildDirectory = await mkdtemp(join(scratchRoot, "mini-compiled-entry-"));
		executable = join(buildDirectory, process.platform === "win32" ? "backlog.exe" : "backlog");
		const env: NodeJS.ProcessEnv = { ...process.env, BACKLOG_BUILD_OUTFILE: executable };
		delete env.BACKLOG_BUILD_OUTDIR;
		delete env.BACKLOG_BUILD_TARGET;
		await execFileAsync(process.execPath, ["scripts/build.ts"], {
			cwd: projectRoot,
			env,
			timeout: 60_000,
		});
	}, 60_000);

	afterAll(async () => {
		if (buildDirectory) await rm(buildDirectory, { recursive: true, force: true, maxRetries: 3 });
	});

	it("executes the shipped entry and publishes restricted help", async () => {
		const { stdout, stderr } = await execFileAsync(executable, ["--help"], { timeout: 10_000 });

		expect(stderr).toBe("");
		expect(stdout).toContain("Usage: backlog [options] [command]");
		for (const command of ["task", "search", "doc", "milestone", "mcp"]) {
			expect(stdout).toMatch(new RegExp(`^  ${command}\\b`, "m"));
		}
		for (const command of ["board", "init", "browser", "instructions"]) {
			expect(stdout).not.toMatch(new RegExp(`^  ${command}\\b`, "m"));
		}
	});

	it.each([
		"board",
		"task archive TASK-1",
		"milestone archive m-1",
	])("rejects excluded compiled invocation: %s", async (args) => {
		await expect(execFileAsync(executable, args.split(" "), { timeout: 10_000 })).rejects.toMatchObject({
			code: 1,
			stderr: expect.stringContaining("error:"),
		});
	});
});
