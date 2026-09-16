import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(import.meta.dir, "../..");
let buildDirectory: string;
let executable: string;

function parseNpmPackOutput(output: string): Array<{ filename: string; files: Array<{ path: string }> }> {
	const lineStarts = [
		0,
		...Array.from(output.matchAll(/\r?\n(?=\[)/g), (match) => (match.index ?? 0) + match[0].length),
	];
	for (const start of lineStarts.reverse()) {
		try {
			const parsed = JSON.parse(output.slice(start).trim());
			if (Array.isArray(parsed)) return parsed;
		} catch {}
	}
	throw new Error("npm pack did not emit a JSON array");
}

it("parses npm pack JSON after a non-JSON preamble", () => {
	expect(
		parseNpmPackOutput('npm notice preparing package\n.[{not json}\n[\n  {"filename":"mini.tgz","files":[]}\n]\n'),
	).toEqual([{ filename: "mini.tgz", files: [] }]);
});

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

	it("passes the compiled and Nix installation smoke against a seeded mini project", async () => {
		const pkg = await Bun.file(join(projectRoot, "package.json")).json();
		const { stdout } = await execFileAsync(
			process.execPath,
			["scripts/smoke-compiled-build.ts", executable, pkg.version],
			{ cwd: projectRoot, timeout: 60000 },
		);
		expect(stdout).toContain("Compiled build smoke checks passed");
	}, 60000);

	it("installs a local source package containing this mini binary without platform dependencies", async () => {
		const source = join(buildDirectory, "source");
		const install = join(buildDirectory, "installed");
		await mkdir(join(source, "dist"), { recursive: true });
		await cp(executable, join(source, "dist", process.platform === "win32" ? "backlog.exe" : "backlog"));
		await cp(join(projectRoot, "scripts"), join(source, "scripts"), { recursive: true });
		await cp(join(projectRoot, "package.json"), join(source, "package.json"));
		const { $ } = await import("bun");
		const packed =
			await $`npm pack --json --ignore-scripts --cache ${join(buildDirectory, "npm-cache")} --pack-destination ${buildDirectory}`
				.cwd(source)
				.quiet();
		const pack = parseNpmPackOutput(packed.stdout.toString())[0];
		if (!pack) throw new Error("npm pack emitted an empty JSON array");
		expect(pack.files.map((file: { path: string }) => file.path)).toContain(
			`dist/backlog${process.platform === "win32" ? ".exe" : ""}`,
		);
		expect(pack.files.map((file: { path: string }) => file.path)).not.toContain("src/test/full-cli-entry.ts");
		await $`npm install --offline --prefix ${install} --cache ${join(buildDirectory, "npm-cache")} --omit=optional --ignore-scripts --no-audit --no-fund ${join(buildDirectory, pack.filename)}`.quiet();
		const { stdout } = await execFileAsync(
			"node",
			[join(install, "node_modules/mini-backlog.md/scripts/cli.cjs"), "--help"],
			{ timeout: 10000 },
		);
		expect(stdout).toContain("mini-backlog.md");
		expect(stdout).not.toMatch(/^ {2}(init|browser|help)\b/m);
		await expect(
			execFileAsync("node", [join(install, "node_modules/mini-backlog.md/scripts/cli.cjs"), "board"], {
				timeout: 10000,
			}),
		).rejects.toMatchObject({ code: 1 });
	}, 60000);

	it("runs a platform artifact with generated fork release metadata", async () => {
		const release = join(buildDirectory, "release");
		const platform = process.platform === "win32" ? "windows" : process.platform;
		const name = `mini-backlog.md-${platform}-${process.arch}`;
		const platformDir = join(release, "node_modules", name);
		await mkdir(platformDir, { recursive: true });
		await cp(executable, join(platformDir, process.platform === "win32" ? "backlog.exe" : "backlog"));
		await cp(join(projectRoot, "scripts/cli.cjs"), join(release, "cli.js"));
		await cp(join(projectRoot, "scripts/resolveBinary.cjs"), join(release, "resolveBinary.cjs"));
		await execFileAsync("node", ["scripts/release-manifest.cjs", "root", join(release, "package.json"), "9.8.7"], {
			cwd: projectRoot,
		});
		await execFileAsync(
			"node",
			[
				"scripts/release-manifest.cjs",
				"platform",
				join(platformDir, "package.json"),
				"9.8.7",
				name,
				process.platform,
				process.arch,
			],
			{ cwd: projectRoot },
		);
		const { stdout } = await execFileAsync("node", [join(release, "cli.js"), "--help"], { timeout: 10000 });
		expect(stdout).toContain("mini-backlog.md");
		await expect(execFileAsync("node", [join(release, "cli.js"), "browser"], { timeout: 10000 })).rejects.toMatchObject(
			{ code: 1 },
		);
	});
});
