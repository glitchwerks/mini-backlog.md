import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { canonicalJson, collectPages, parseCliHelp, validateTarget } from "../../scripts/surface-manifest.ts";

const captureScript = resolve("scripts/capture-surface.ts");
const fixture = resolve("src/test/fixtures/surface-manifest-target.ts");
const directories: string[] = [];

afterEach(async () => {
	await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function runCapture(extra: Record<string, unknown> = {}) {
	const directory = await mkdtemp(join(tmpdir(), "surface-manifest-"));
	directories.push(directory);
	const target = join(directory, "target.json");
	const output = join(directory, "manifest.json");
	await writeFile(
		target,
		JSON.stringify({ command: [process.execPath, fixture], cwd: directory, label: "fixture", ...extra }),
	);
	const child = Bun.spawn([process.execPath, captureScript, "--target", target, "--output", output], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
	return { exitCode, stderr, directory, output, target };
}

describe("runtime surface capture command", () => {
	it("captures an external CLI and every MCP discovery page without Git or source imports", async () => {
		const result = await runCapture();
		expect(result.stderr).toBe("");
		expect(result.exitCode).toBe(0);
		const manifest = JSON.parse(await readFile(result.output, "utf8"));
		expect(manifest.manifestVersion).toBe(1);
		expect(manifest.identity).toEqual({
			label: "fixture",
			cliVersion: "1.0.0",
			mcpServer: { name: "Surface fixture", version: "1.0.0" },
		});
		expect(manifest.surface.cli.map((command: { path: string[] }) => command.path.join(" "))).toEqual([
			"",
			"help",
			"inspect",
			"task",
			"task create",
			"task help",
		]);
		expect(
			manifest.surface.cli.find((command: { path: string[] }) => command.path.join(" ") === "task").aliases,
		).toEqual(["tasks"]);
		expect(
			manifest.surface.cli.find((command: { path: string[] }) => command.path.join(" ") === "task create").arguments,
		).toEqual(["<title>", "[labels...]"]);
		for (const list of ["tools", "resources", "resourceTemplates", "prompts"]) {
			expect(manifest.surface.mcp[list].map((item: { name: string }) => item.name)).toEqual(["alpha", "zeta"]);
		}
		expect(manifest.surface.mcp.tools[0].inputSchema).toEqual({
			type: "object",
			properties: { title: { type: "string", enum: ["two", "one"] } },
			required: ["title"],
			additionalProperties: false,
		});
	}, 20_000);

	it("produces identical bytes across repeated captures and fixture locations", async () => {
		const first = await runCapture();
		const second = await runCapture();
		expect(first.exitCode).toBe(0);
		expect(second.exitCode).toBe(0);
		expect(await readFile(first.output, "utf8")).toBe(await readFile(second.output, "utf8"));
	}, 20_000);

	it("records schema constraints and changes instead of only recording property names", async () => {
		const result = await runCapture({
			command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ changedSchema: true })],
		});
		expect(result.exitCode).toBe(0);
		const manifest = JSON.parse(await readFile(result.output, "utf8"));
		expect(manifest.surface.mcp.tools[0].inputSchema.properties.title.enum).toEqual(["three"]);
		expect(manifest.surface.mcp.tools[0].inputSchema.required).toEqual(["title"]);
		expect(manifest.surface.mcp.tools[0].inputSchema.additionalProperties).toBe(false);
	}, 20_000);

	it("records empty discovery for capabilities the server does not advertise", async () => {
		const result = await runCapture({
			command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ limited: true })],
		});
		expect(result.exitCode).toBe(0);
		const manifest = JSON.parse(await readFile(result.output, "utf8"));
		expect(manifest.surface.mcp).toEqual({ tools: [], resources: [], resourceTemplates: [], prompts: [] });
	}, 20_000);

	it("inventories advertised output schema references without compiling or fetching them", async () => {
		const result = await runCapture({
			command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ unresolvedOutput: true })],
		});
		expect(result.stderr).toBe("");
		expect(result.exitCode).toBe(0);
		const manifest = JSON.parse(await readFile(result.output, "utf8"));
		expect(manifest.surface.mcp.tools[0].outputSchema.properties.value.$ref).toBe("https://example.org/schema/value");
	}, 20_000);

	it.each(["malformedHelp", "loop"])("rejects %s without publishing a partial manifest", async (problem) => {
		const result = await runCapture({
			command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ [problem]: true })],
		});
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toMatch(problem === "loop" ? /repeated MCP discovery cursor/ : /Missing CLI Usage/);
		expect(await Bun.file(result.output).exists()).toBe(false);
	}, 20_000);

	it("fails visibly for an executable that cannot launch", async () => {
		const result = await runCapture({ command: [join(tmpdir(), "nonexistent-surface-build-694.exe")] });
		expect(result.exitCode).toBe(1);
		expect(result.stderr.length).toBeGreaterThan(0);
		expect(await Bun.file(result.output).exists()).toBe(false);
	});

	it("leaves an existing manifest unchanged if replacement discovery fails", async () => {
		const result = await runCapture();
		expect(result.exitCode).toBe(0);
		const before = await readFile(result.output, "utf8");
		await writeFile(
			result.target,
			JSON.stringify({
				command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ loop: true })],
				cwd: result.directory,
				label: "fixture",
			}),
		);
		const child = Bun.spawn([process.execPath, captureScript, "--target", result.target, "--output", result.output], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const [exitCode] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		expect(exitCode).toBe(1);
		expect(await readFile(result.output, "utf8")).toBe(before);
	}, 20_000);

	it("captures the shipped mini entry twice against an isolated initialized project", async () => {
		const directory = await mkdtemp(join(tmpdir(), "surface-real-mini-"));
		directories.push(directory);
		const entry = resolve("src/bin/cli.ts");
		const init = Bun.spawn(
			[
				process.execPath,
				entry,
				"init",
				"Surface fixture",
				"--defaults",
				"--no-git",
				"--integration-mode",
				"none",
				"--agent-instructions",
				"none",
			],
			{ cwd: directory, env: { ...process.env, BACKLOG_CWD: directory }, stdout: "pipe", stderr: "pipe" },
		);
		const [initCode, initErrors] = await Promise.all([
			init.exited,
			new Response(init.stderr).text(),
			new Response(init.stdout).text(),
		]);
		expect(initErrors).toBe("");
		expect(initCode).toBe(0);
		const target = join(directory, "target.json");
		const output = join(directory, "manifest.json");
		await writeFile(
			target,
			JSON.stringify({ command: [process.execPath, entry], cwd: directory, label: "mini-source" }),
		);
		const captures: string[] = [];
		for (let attempt = 0; attempt < 2; attempt++) {
			const child = Bun.spawn([process.execPath, captureScript, "--target", target, "--output", output], {
				stdout: "pipe",
				stderr: "pipe",
			});
			const [exitCode, errors] = await Promise.all([
				child.exited,
				new Response(child.stderr).text(),
				new Response(child.stdout).text(),
			]);
			expect(errors).toBe("");
			expect(exitCode).toBe(0);
			captures.push(await readFile(output, "utf8"));
		}
		expect(captures[0]).toBe(captures[1]);
		const manifest = JSON.parse(captures[0] ?? "");
		expect(manifest.surface.cli.some((command: { path: string[] }) => command.path.join(" ") === "browser")).toBe(true);
		expect(manifest.surface.cli.some((command: { path: string[] }) => command.path.join(" ") === "task archive")).toBe(
			false,
		);
		expect(manifest.surface.mcp.tools.map((tool: { name: string }) => tool.name)).toEqual([
			"document_create",
			"document_list",
			"document_search",
			"document_update",
			"document_view",
			"milestone_add",
			"milestone_list",
			"milestone_remove",
			"milestone_rename",
			"task_complete",
			"task_create",
			"task_edit",
			"task_list",
			"task_search",
			"task_view",
		]);
	}, 60_000);

	it.each(["hangCli", "hangMcp"])("bounds %s and cleans up the launched process", async (problem) => {
		const directory = await mkdtemp(join(tmpdir(), "surface-process-"));
		directories.push(directory);
		const pidFile = join(directory, "pids.txt");
		const result = await runCapture({
			command: [process.execPath, fixture, "--fixture-config", JSON.stringify({ [problem]: true, pidFile })],
			timeoutMs: 500,
		});
		expect(result.exitCode).toBe(1);
		expect(result.stderr).toMatch(/timed out/i);
		expect(await Bun.file(result.output).exists()).toBe(false);
		const pids = (await readFile(pidFile, "utf8")).trim().split("\n").map(Number);
		for (const pid of pids) expect(() => process.kill(pid, 0)).toThrow();
	}, 20_000);

	it.skipIf(process.platform === "win32")(
		"hard-kills a CLI process that ignores SIGTERM",
		async () => {
			const directory = await mkdtemp(join(tmpdir(), "surface-sigterm-"));
			directories.push(directory);
			const pidFile = join(directory, "pids.txt");
			const result = await runCapture({
				command: [
					process.execPath,
					fixture,
					"--fixture-config",
					JSON.stringify({ hangCli: true, ignoreTerm: true, pidFile }),
				],
				timeoutMs: 500,
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr).toMatch(/timed out/i);
			for (const pid of (await readFile(pidFile, "utf8")).trim().split("\n").map(Number)) {
				expect(() => process.kill(pid, 0)).toThrow();
			}
		},
		10_000,
	);
});

describe("surface manifest parsing", () => {
	it("captures aliases, optional/required/variadic arguments, negated options, and wrapped help", () => {
		const result = parseCliHelp(
			"Usage: backlog task|tasks create [options] <title> [labels...]\r\n\r\nOptions:\r\n  -d, --description <text>  task description\r\n                            continued on the next line\r\n  --format [kind]          output format\r\n  --no-cache               disable cache\r\n  -h, --help               help\r\n",
			["task", "create"],
		);
		expect(result.command.arguments).toEqual(["<title>", "[labels...]"]);
		expect(result.command.options).toEqual([
			{ flags: ["--description", "-d"], argument: "<text>" },
			{ flags: ["--format"], argument: "[kind]" },
			{ flags: ["--help", "-h"], argument: null },
			{ flags: ["--no-cache"], argument: null },
		]);
	});

	it.each([
		"not help",
		"Usage: backlog [options]\n",
		"Usage: backlog [options]\nOptions:\n",
		"Usage: backlog [options]\nOptions:\n  --help\n --important\n",
		"Usage: backlog [options] [command]\nOptions:\n  --help\nCommands:\n  help [command]  display help for command\n create <title>\n",
		"Usage: backlog [options] [command]\nOptions:\n  --help\n",
		"Usage: backlog [options] [command]\nOptions:\n  --help\nCommands:\n",
		"Usage: backlog [options]\nOptions:\n  --flag unexpected syntax\n",
		"Usage: backlog [options]\nOptions:\n  --help\nCommands:\n  bad/command\n",
	])("rejects incomplete or unrecognized help instead of omitting entries", (help) => {
		expect(() => parseCliHelp(help)).toThrow();
	});

	it("sorts object keys without altering schema arrays or constraints", () => {
		expect(canonicalJson({ z: { required: ["z", "a"], properties: { z: {}, a: {} } }, a: false })).toBe(
			canonicalJson({ a: false, z: { properties: { a: {}, z: {} }, required: ["z", "a"] } }),
		);
		expect(JSON.parse(canonicalJson({ enum: ["two", "one"] })).enum).toEqual(["two", "one"]);
	});

	it("follows cursors and sorts items independently of discovery order", async () => {
		const cursors: (string | undefined)[] = [];
		const result = await collectPages(
			async (cursor) => {
				cursors.push(cursor);
				return cursor ? { items: [{ name: "a" }] } : { items: [{ name: "z" }], nextCursor: "next" };
			},
			(item) => item.name,
		);
		expect(result).toEqual([{ name: "a" }, { name: "z" }]);
		expect(cursors).toEqual([undefined, "next"]);
	});

	it("rejects duplicates across discovery pages", async () => {
		await expect(
			collectPages(
				async (cursor) => ({ items: [{ name: "same" }], nextCursor: cursor ? undefined : "next" }),
				(item) => item.name,
			),
		).rejects.toThrow("duplicate");
	});

	it("rejects invalid target arguments and timeout bounds", async () => {
		await expect(validateTarget({ command: "backlog", cwd: tmpdir(), label: "fixture" })).rejects.toThrow("array");
		await expect(validateTarget({ command: ["backlog"], cwd: ".", label: "fixture" })).rejects.toThrow("absolute");
		await expect(
			validateTarget({ command: ["backlog"], cwd: tmpdir(), label: "fixture", timeoutMs: 0 }),
		).rejects.toThrow("timeoutMs");
	});
});
