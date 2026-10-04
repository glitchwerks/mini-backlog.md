import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(import.meta.dir, "../..");
let buildDirectory: string;
let executable: string;

function parseNpmPackOutput(output: string): Array<{ filename: string; files: Array<{ path: string }> }> {
	const arrayStarts = Array.from(output.matchAll(/\[/g), (match) => match.index ?? 0);
	for (const start of arrayStarts.reverse()) {
		try {
			const parsed = JSON.parse(output.slice(start).trim());
			if (Array.isArray(parsed)) return parsed;
		} catch {}
	}
	throw new Error("npm pack did not emit a JSON array");
}

async function runCommand(args: string[], cwd: string, timeout: number, env?: NodeJS.ProcessEnv) {
	const child = Bun.spawn(args, {
		cwd,
		env,
		detached: process.platform !== "win32",
		stdout: "pipe",
		stderr: "pipe",
	});
	const readers = [child.stdout.getReader(), child.stderr.getReader()] as const;
	async function readOutput(reader: ReadableStreamDefaultReader<Uint8Array>) {
		const decoder = new TextDecoder();
		let text = "";
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) return text + decoder.decode();
				text += decoder.decode(value, { stream: true });
			}
		} finally {
			reader.releaseLock();
		}
	}
	function cancelOutput() {
		for (const reader of readers) void reader.cancel(timeoutError).catch(() => {});
	}
	const timeoutError = new Error(`Command timed out after ${timeout}ms: ${args[0]}`);
	let timedOut = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timer = setTimeout(async () => {
			timedOut = true;
			try {
				if (process.platform === "win32") {
					// .cmd launchers leave Node descendants holding the output pipes open.
					await execFileAsync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
						timeout: 5_000,
						windowsHide: true,
					}).catch(() => child.kill("SIGKILL"));
				} else {
					try {
						process.kill(-child.pid, "SIGKILL");
					} catch {
						child.kill("SIGKILL");
					}
				}
			} catch {
				// The parent may already be gone; output must still stop draining.
			} finally {
				reject(timeoutError);
				cancelOutput();
			}
		}, timeout);
	});
	try {
		const [stdout, stderr, exitCode] = await Promise.race([
			Promise.all([readOutput(readers[0]), readOutput(readers[1]), child.exited]),
			deadline,
		]);
		if (timedOut) throw timeoutError;
		return { stdout, stderr, exitCode };
	} finally {
		clearTimeout(timer);
		if (timedOut) cancelOutput();
	}
}

async function runNpm(cwd: string, ...args: string[]): Promise<string> {
	const { stdout, stderr, exitCode } = await runCommand(["npm", ...args], cwd, 30_000);
	expect(exitCode, `npm ${args[0]} failed: ${stderr}`).toBe(0);
	return stdout;
}

it("parses npm pack JSON after a non-JSON preamble", () => {
	expect(
		parseNpmPackOutput('npm notice preparing package\n.[{not json}\n[\n  {"filename":"mini.tgz","files":[]}\n]\n'),
	).toEqual([{ filename: "mini.tgz", files: [] }]);
});

it("parses npm pack JSON after an inline progress prefix", () => {
	expect(parseNpmPackOutput('.[\n  {"filename":"mini.tgz","files":[]}\n]\n')).toEqual([
		{ filename: "mini.tgz", files: [] },
	]);
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

	it.each([false, true])("stops descendants holding output pipes open (parent exits early: %s)", async (exitsEarly) => {
		const script = join(buildDirectory, "hanging-command.cjs");
		const pidFile = join(buildDirectory, "hanging-child.pid");
		const heartbeatFile = join(buildDirectory, `hanging-child-${exitsEarly}.heartbeat`);
		await Bun.write(
			script,
			`const fs = require("node:fs");
const child = require("node:child_process").spawn(process.execPath, ["-e", 'const fs = require("node:fs"); let count = 0; function heartbeat() { fs.writeFileSync(process.argv[1], String(count++)); } heartbeat(); setInterval(heartbeat, 25);', process.argv[3]], {stdio: "inherit"});
fs.writeFileSync(process.argv[2], String(child.pid));
setInterval(() => { if (${exitsEarly} && fs.existsSync(process.argv[3])) process.exit(0); }, 10);`,
		);
		let watchdog: ReturnType<typeof setTimeout> | undefined;
		try {
			try {
				const result = (await Promise.race([
					runCommand(["node", script, pidFile, heartbeatFile], buildDirectory, 2_000),
					new Promise((_, reject) => {
						watchdog = setTimeout(() => reject(new Error("Descendant pipes did not close")), 7_000);
					}),
				])) as { exitCode: number };
				// Bun may terminate descendants immediately when their parent exits.
				expect(exitsEarly).toBe(true);
				expect(result.exitCode).toBe(0);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain("Command timed out after 2000ms");
			}
			expect(await Bun.file(pidFile).exists()).toBe(true);
			const heartbeat = await Bun.file(heartbeatFile).text();
			await Bun.sleep(200);
			expect(await Bun.file(heartbeatFile).text()).toBe(heartbeat);
		} finally {
			clearTimeout(watchdog);
			if (await Bun.file(pidFile).exists()) {
				try {
					process.kill(Number(await Bun.file(pidFile).text()), "SIGKILL");
				} catch {}
			}
		}
	});

	it("releases output readers when an exited command leaves its pipes open", async () => {
		const child = Bun.spawn(["node", "-e", "process.exit(0)"], { stdout: "pipe", stderr: "pipe" });
		await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
		let cancelled = 0;
		const stdout = new ReadableStream({
			cancel: () => {
				cancelled++;
			},
		});
		const stderr = new ReadableStream({
			cancel: () => {
				cancelled++;
			},
		});
		// Windows Bun currently closes these pipes on parent exit. Replay retained pipes
		// on a real exited child so that behavior cannot hide a missing drain deadline.
		Object.defineProperties(child, { stdout: { value: stdout }, stderr: { value: stderr } });
		const spawn = spyOn(Bun, "spawn").mockReturnValueOnce(child);
		let watchdog: ReturnType<typeof setTimeout> | undefined;
		try {
			await expect(
				Promise.race([
					runCommand(["node", "-e", "process.exit(0)"], projectRoot, 100),
					new Promise((_, reject) => {
						watchdog = setTimeout(() => reject(new Error("Output drain never stopped")), 7_000);
					}),
				]),
			).rejects.toThrow("Command timed out after 100ms");
			await Bun.sleep(0);
			expect(cancelled).toBe(2);
			expect(stdout.locked).toBe(false);
			expect(stderr.locked).toBe(false);
		} finally {
			clearTimeout(watchdog);
			spawn.mockRestore();
		}
	});

	it("executes the shipped entry and publishes restricted help", async () => {
		const { stdout, stderr } = await execFileAsync(executable, ["--help"], { timeout: 10_000 });

		expect(stderr).toBe("");
		expect(stdout).toContain("Usage: backlog [options] [command]");
		for (const command of ["init", "instructions", "task", "search", "doc", "milestone", "mcp", "browser"]) {
			expect(stdout).toMatch(new RegExp(`^  ${command}\\b`, "m"));
		}
		for (const command of ["board"]) {
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

	it("passes the compiled installation smoke against a seeded mini project", async () => {
		const pkg = await Bun.file(join(projectRoot, "package.json")).json();
		const { stdout } = await execFileAsync(
			process.execPath,
			["scripts/smoke-compiled-build.ts", executable, pkg.version],
			{ cwd: projectRoot, timeout: 60000 },
		);
		expect(stdout).toContain("Compiled build smoke checks passed");
		expect(stdout).toContain("Compiled browser smoke checks passed");
	}, 60000);

	it("installs the mini CLI and initializes, reads instructions, and creates and edits project entities", async () => {
		const source = join(buildDirectory, "source");
		const install = join(buildDirectory, "installed");
		await mkdir(join(source, "dist"), { recursive: true });
		await cp(executable, join(source, "dist", process.platform === "win32" ? "backlog.exe" : "backlog"));
		await cp(join(projectRoot, "scripts"), join(source, "scripts"), { recursive: true });
		await cp(join(projectRoot, "package.json"), join(source, "package.json"));
		const cache = join(buildDirectory, "npm-cache");
		const packed = await runNpm(
			source,
			"pack",
			"--json",
			"--ignore-scripts",
			"--cache",
			cache,
			"--pack-destination",
			buildDirectory,
		);
		const pack = parseNpmPackOutput(packed)[0];
		if (!pack) throw new Error("npm pack emitted an empty JSON array");
		expect(pack.files.map((file: { path: string }) => file.path)).toContain(
			`dist/backlog${process.platform === "win32" ? ".exe" : ""}`,
		);
		expect(pack.files.map((file: { path: string }) => file.path)).not.toContain("src/test/full-cli-entry.ts");
		await runNpm(
			source,
			"install",
			"--offline",
			"--prefix",
			install,
			"--cache",
			cache,
			"--omit=optional",
			"--ignore-scripts",
			"--no-audit",
			"--no-fund",
			join(buildDirectory, pack.filename),
		);
		const workspace = join(buildDirectory, "installed project");
		await mkdir(workspace);
		const env = { ...process.env, BACKLOG_CWD: workspace };
		const launcher = join(install, "node_modules/.bin", process.platform === "win32" ? "backlog.cmd" : "backlog");
		async function backlog(...args: string[]): Promise<string> {
			const { stdout, stderr, exitCode } = await runCommand([launcher, ...args], workspace, 10_000, env);
			if (exitCode !== 0) throw new Error(`backlog ${args.join(" ")} exited ${exitCode}: ${stderr}`);
			expect(stderr, `backlog ${args.join(" ")}`).toBe("");
			return stdout;
		}
		await execFileAsync("git", ["init"], { cwd: workspace, timeout: 10_000 });
		await execFileAsync("git", ["config", "user.name", "Installed CLI Smoke"], { cwd: workspace, timeout: 10_000 });
		await execFileAsync("git", ["config", "user.email", "smoke@example.invalid"], { cwd: workspace, timeout: 10_000 });
		expect(await backlog("instructions", "init-required")).toContain("backlog init");
		await backlog(
			"init",
			"Installed smoke",
			"--defaults",
			"--integration-mode",
			"cli",
			"--agent-instructions",
			"agents",
			"--check-branches",
			"false",
			"--include-remote",
			"false",
		);
		expect(await Bun.file(join(workspace, "AGENTS.md")).text()).toContain("backlog instructions overview");
		expect(await backlog("instructions", "overview")).toContain("backlog instructions task-creation");
		for (const guide of ["task-creation", "task-execution", "task-finalization"]) {
			expect(await backlog("instructions", guide)).toContain("backlog task");
		}

		await backlog("milestone", "add", "Release Alpha", "--description", "Installed milestone scope");
		const milestones = await backlog("milestone", "list", "--plain");
		const milestoneId = milestones.match(/^\s+(m-\d+): Release Alpha /m)?.[1];
		if (!milestoneId) throw new Error(`Created milestone missing from CLI list: ${milestones}`);
		expect(milestones).toContain("Installed milestone scope");
		await backlog(
			"task",
			"create",
			"Installed task",
			"--description",
			"Original task description",
			"--milestone",
			milestoneId,
			"--ac",
			"Installed workflow works",
			"--plain",
		);
		const tasks = JSON.parse(await backlog("task", "list", "--json")).tasks;
		expect(tasks).toHaveLength(1);
		const taskId = tasks[0].id;
		expect(JSON.parse(await backlog("task", "view", taskId, "--json")).task.description).toBe(
			"Original task description",
		);
		await backlog(
			"task",
			"edit",
			taskId,
			"--title",
			"Edited installed task",
			"--description",
			"Edited task description",
			"--status",
			"In Progress",
			"--check-ac",
			"1",
		);
		await backlog("milestone", "rename", milestoneId, "Release Beta");
		const renamedMilestones = await backlog("milestone", "list", "--plain");
		expect(renamedMilestones).toContain(`${milestoneId}: Release Beta`);
		expect(renamedMilestones).not.toContain("Release Alpha");
		const task = JSON.parse(await backlog("task", "view", taskId, "--json")).task;
		expect(task).toMatchObject({
			id: taskId,
			title: "Edited installed task",
			description: "Edited task description",
			status: "In Progress",
			milestone: milestoneId,
		});
		expect(task.acceptanceCriteria).toEqual([{ index: 1, text: "Installed workflow works", checked: true }]);

		const createdDoc = await backlog("doc", "create", "Installed guide", "--type", "guide", "--plain");
		const docId = createdDoc.match(/Created document (\S+)/)?.[1];
		if (!docId) throw new Error(`Document creation did not report an allocated ID: ${createdDoc}`);
		expect(await backlog("doc", "list", "--plain")).toContain("Installed guide");
		const content = "Document content survives a separate CLI invocation with **Markdown** formatting.";
		await backlog("doc", "update", docId, "--title", "Edited installed guide", "--content", content);
		const document = await backlog("doc", "view", docId, "--plain");
		expect(document).toContain("Edited installed guide");
		expect(document).toContain(content);
		const stdout = await backlog("--help");
		expect(stdout).toContain("mini-backlog.md");
		for (const command of ["init", "instructions", "browser"]) {
			expect(stdout).toMatch(new RegExp(`^ {2}${command}\\b`, "m"));
		}
		expect(stdout).not.toMatch(/^ {2}(board|help)\b/m);
		await expect(backlog("board")).rejects.toThrow("exited 1: error:");
		const pkg = await Bun.file(join(projectRoot, "package.json")).json();
		const installedExecutable = join(
			install,
			"node_modules/mini-backlog.md/dist",
			process.platform === "win32" ? "backlog.exe" : "backlog",
		);
		const smoke = await execFileAsync(
			process.execPath,
			["scripts/smoke-compiled-build.ts", installedExecutable, pkg.version],
			{ cwd: projectRoot, timeout: 60000 },
		);
		expect(smoke.stdout).toContain("Compiled browser smoke checks passed");
	}, 60000);
});
