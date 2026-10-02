import { describe, expect, it } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { MINI_CLI_OPTIONS } from "../mini/surface-policy.ts";
import { safeCleanup } from "./test-utils.ts";

const MINI_CLI_PATH = join(process.cwd(), "src", "cli.ts");

async function runMini(...args: string[]) {
	return await $`bun ${[MINI_CLI_PATH, ...args]}`.quiet().nothrow();
}

function optionNamesFromHelp(help: string): string[] {
	const options = help.split("Options:\n")[1]?.split("\n\n")[0] ?? "";
	return options
		.split("\n")
		.map((line) => line.match(/^ {2}(?:-\w, )?(--[\w-]+)/)?.[1])
		.filter((option): option is string => option !== undefined)
		.sort();
}

describe("shipped mini CLI surface", () => {
	it("publishes only the exact root commands", async () => {
		const result = await runMini("--help");
		const output = result.stdout.toString();
		const commandSection = output.split("Commands:\n")[1] ?? "";

		expect(result.exitCode).toBe(0);
		expect(
			commandSection
				.split("\n")
				.filter((line) => /^ {2}\S/.test(line))
				.map((line) => line.trim().split(/\s/)[0])
				.sort(),
		).toEqual(["browser", "doc", "init", "instructions", "mcp", "milestone", "search", "task"]);
		for (const allowed of ["init", "task", "search", "doc", "milestone", "instructions", "mcp", "browser"]) {
			expect(output).toContain(allowed);
		}
		for (const hidden of [
			"draft",
			"board",
			"decision",
			"agents",
			"config",
			"doctor",
			"cleanup",
			"overview",
			"completion",
		]) {
			expect(output).not.toMatch(new RegExp(`\\b${hidden}\\b`));
		}
	});

	it.each([
		"draft",
		"board",
		"decision",
		"agents",
		"config",
		"doctor",
		"cleanup",
		"overview",
		"completion",
		"task archive TASK-1",
		"milestone archive m-1",
		"task create X --due-date 2026-09-14",
		"task edit TASK-1 --project Web",
		"tasks list",
		"milestones list",
		"task 1",
		"--plain",
		"help",
		"task help",
	])("rejects excluded invocation: %s", async (args) => {
		const result = await runMini(...args.split(" "));

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).not.toContain("Definition of Done");
	});

	it("publishes a prompt-free init command that initializes a fresh directory", async () => {
		const dir = await mkdtemp(join(tmpdir(), "mini-init-"));
		try {
			const guide = await runMini("instructions", "init-required");
			const command = 'backlog init "Project Name" --defaults --no-git --integration-mode none';

			expect(guide.exitCode).toBe(0);
			expect(guide.stdout.toString()).toContain(command);

			const result = await $`bun ${MINI_CLI_PATH} init "Project Name" --defaults --no-git --integration-mode none`
				.cwd(dir)
				.quiet()
				.nothrow();

			expect(result.exitCode).toBe(0);
			expect(await Bun.file(join(dir, "backlog", "config.yml")).exists()).toBe(true);
			expect(result.stdout.toString()).toContain("Initialized backlog project: Project Name");
		} finally {
			await safeCleanup(dir);
		}
	});

	it("installs mini-compatible Claude agent guidance through init", async () => {
		const dir = await mkdtemp(join(tmpdir(), "mini-init-claude-agent-"));
		try {
			const result =
				await $`bun ${MINI_CLI_PATH} init "Mini Agent" --defaults --no-git --integration-mode cli --install-claude-agent true`
					.cwd(dir)
					.quiet()
					.nothrow();

			expect(result.exitCode).toBe(0);
			const content = await Bun.file(join(dir, ".claude", "agents", "project-manager-backlog.md")).text();
			expect(content).toContain("backlog instructions overview");
			expect(content).toContain("backlog task create");
			for (const excluded of ["--plan", "--notes", "--parent", "backlog task <id>", "backlog task archive"]) {
				expect(content).not.toContain(excluded);
			}
		} finally {
			await safeCleanup(dir);
		}
	});

	it("publishes every workflow guide including initialization", async () => {
		const [index, overview, initRequired] = await Promise.all([
			runMini("instructions"),
			runMini("instructions", "overview"),
			runMini("instructions", "init-required"),
		]);

		for (const result of [index, overview, initRequired]) expect(result.exitCode).toBe(0);
		expect(index.stdout.toString()).toContain("backlog instructions task-finalization");
		expect(index.stdout.toString()).toContain("backlog instructions init-required");
		expect(overview.stdout.toString()).toContain("Backlog.md Overview (CLI)");
		expect(initRequired.stdout.toString()).toContain(
			'backlog init "Project Name" --defaults --no-git --integration-mode none',
		);
	});

	it("explains when mini agents should create tasks", async () => {
		const result = await runMini("instructions", "overview");
		const output = result.stdout.toString();

		expect(result.exitCode).toBe(0);
		expect(output).toContain("Create a task for substantive work");
		expect(output).toMatch(
			/Skip task creation for questions,\s+explanations, quick lookups, and obvious mechanical changes\./,
		);
	});

	it.each([
		["overview", ["backlog search", "backlog instructions task-creation"]],
		["task-creation", ["backlog task create", "--ac"]],
		["task-execution", ["backlog task view", "backlog task edit", "--comment"]],
		["task-finalization", ["--check-ac", "backlog task complete"]],
		[
			"init-required",
			['backlog init "Project Name" --defaults --no-git --integration-mode none', "backlog instructions overview"],
		],
	] as const)("publishes mini-compatible %s guidance", async (guide, expectedCommands) => {
		const result = await runMini("instructions", guide);
		const output = result.stdout.toString();

		expect(result.exitCode).toBe(0);
		for (const expected of expectedCommands) expect(output).toContain(expected);
		for (const excluded of [
			"backlog doctor",
			"backlog task <id>",
			"--parent",
			"--project",
			"--dod",
			"--doc",
			"--ref",
			"--plan",
			"--append-plan",
			"--append-notes",
			"--check-dod",
			"--final-summary",
		]) {
			expect(output).not.toContain(excluded);
		}
	});

	it("publishes the complete production init option surface", async () => {
		const result = await runMini("init", "--help");

		expect(result.exitCode).toBe(0);
		expect(optionNamesFromHelp(result.stdout.toString())).toEqual(
			[
				"--agent-instructions",
				"--auto-open-browser",
				"--backlog-dir",
				"--branch-days",
				"--bypass-git-hooks",
				"--check-branches",
				"--config-location",
				"--default-editor",
				"--defaults",
				"--help",
				"--include-remote",
				"--install-claude-agent",
				"--integration-mode",
				"--no-git",
				"--task-prefix",
				"--web-port",
				"--zero-padded-ids",
			].sort(),
		);
	});

	it("publishes only the browser's approved options", async () => {
		const result = await runMini("browser", "--help");
		const help = result.stdout.toString();

		expect(result.exitCode).toBe(0);
		expect(optionNamesFromHelp(help)).toEqual(["--help", "--no-open", "--port"]);
		expect(help).toContain("-p, --port");
		expect(help).not.toContain("--non-interactive");
	});

	it("prints restricted Commander help for a bare invocation", async () => {
		const [bare, help] = await Promise.all([runMini(), runMini("--help")]);

		expect(bare.exitCode).toBe(0);
		expect(bare.stdout.toString()).toBe(help.stdout.toString());
		expect(bare.stdout.toString()).toContain("Usage: backlog [options] [command]");
	});

	it.each([
		["task create", ["task", "create"]],
		["task edit", ["task", "edit"]],
	] as const)("fails noninteractively when %s omits required arguments", async (_name, args) => {
		const result = await runMini(...args);

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain("missing required argument");
	});

	it("rejects the excluded decision search type", async () => {
		const result = await runMini("search", "anything", "--type", "decision");

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain("decision");
	});

	it("rejects task list sorting outside the mini allowlist", async () => {
		const result = await runMini("task", "list", "--sort", "ordinal");

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).toContain("ordinal");
	});

	it("preserves production short aliases for allowed options and hides excluded help concepts", async () => {
		const results = await Promise.all([
			runMini("--help"),
			runMini("browser", "--help"),
			runMini("task", "create", "--help"),
			runMini("task", "edit", "--help"),
			runMini("task", "list", "--help"),
			runMini("doc", "create", "--help"),
			runMini("doc", "update", "--help"),
			runMini("milestone", "add", "--help"),
			runMini("mcp", "start", "--help"),
			runMini("search", "--help"),
		]);
		const output = results.map((result) => result.stdout.toString()).join("\n");

		for (const result of results) expect(result.exitCode).toBe(0);
		for (const allowed of ["--description", "--assignee", "--depends-on", "--ac", "--sort", "--type"]) {
			expect(output).toContain(allowed);
		}
		for (const alias of [
			"-v, --version",
			"-h, --help",
			"-p, --port",
			"-d, --description",
			"-a, --assignee",
			"-s, --status",
			"-l, --labels",
			"-m, --milestone",
			"-t, --title",
			"-l, --label",
			"-p, --path",
			"-t, --type",
			"-d, --debug",
		]) {
			expect(output).toContain(alias);
		}
		expect(output).not.toMatch(/(^|\s)--desc(?:\s|$)/m);
		expect(output).not.toMatch(/(^|\s)--dep(?:\s|$)/m);
		for (const hidden of ["--due-date", "--project", "Definition of Done", "implementation", "decision", "archive"]) {
			expect(output).not.toContain(hidden);
		}
	});
});

it.each(
	Object.entries(MINI_CLI_OPTIONS),
)("publishes exact options and arguments for '%s'", async (path, allowedOptions) => {
	const argsByPath: Record<string, string[]> = {
		init: ["[projectName]"],
		instructions: ["[guide]"],
		"task create": ["<title>"],
		"task edit": ["<taskIds...>"],
		"task view": ["<taskId>"],
		"task complete": ["<taskId>"],
		search: ["[query]"],
		"doc create": ["<title>"],
		"doc update": ["<docId>"],
		"doc view": ["<docId>"],
		"doc search": ["<query>"],
		"milestone add": ["<name>"],
		"milestone rename": ["<from>", "<to>"],
		"milestone remove": ["<name>"],
	};
	const result = await runMini(...(path ? path.split(" ") : []), "--help");
	const help = result.stdout.toString();
	expect(result.exitCode).toBe(0);
	expect(optionNamesFromHelp(help)).toEqual([...allowedOptions, "--help"].sort());
	const usage = help.split("\n")[0] ?? "";
	expect(
		[...usage.matchAll(/<[^>]+>|\[[^\]]+\]/g)]
			.map((match) => match[0])
			.filter((arg) => arg !== "[options]" && arg !== "[command]"),
	).toEqual(argsByPath[path] ?? []);
});

it.each([
	["task", ["complete", "create", "edit", "list", "view"]],
	["doc", ["create", "list", "search", "update", "view"]],
	["milestone", ["add", "list", "remove", "rename"]],
	["mcp", ["start"]],
] as const)("publishes the exact %s group without positional shorthand", async (group, expected) => {
	const result = await runMini(group, "--help");
	const help = result.stdout.toString();
	expect(result.exitCode).toBe(0);
	expect(help.split("\n")[0]).toBe(`Usage: backlog ${group} [options] [command]`);
	expect(
		help
			.split("Commands:\n")[1]
			?.trim()
			.split("\n")
			.map((line) => line.trim().split(/\s/)[0])
			.sort(),
	).toEqual([...expected]);
});
