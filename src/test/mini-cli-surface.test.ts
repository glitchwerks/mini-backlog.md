import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";

const MINI_CLI_PATH = join(process.cwd(), "src", "cli.ts");

async function runMini(...args: string[]) {
	return await $`bun ${[MINI_CLI_PATH, ...args]}`.quiet().nothrow();
}

describe("shipped mini CLI surface", () => {
	it("publishes only the exact root commands", async () => {
		const result = await runMini("--help");
		const output = result.stdout.toString();

		expect(result.exitCode).toBe(0);
		for (const allowed of ["task", "search", "doc", "milestone", "mcp"]) expect(output).toContain(allowed);
		for (const hidden of [
			"init",
			"draft",
			"board",
			"decision",
			"agents",
			"config",
			"doctor",
			"cleanup",
			"browser",
			"overview",
			"completion",
			"instructions",
		]) {
			expect(output).not.toMatch(new RegExp(`\\b${hidden}\\b`));
		}
	});

	it.each([
		"init",
		"task archive TASK-1",
		"milestone archive m-1",
		"task create X --due-date 2026-09-14",
		"task edit TASK-1 --project Web",
		"tasks list",
		"task 1",
	])("rejects excluded invocation: %s", async (args) => {
		const result = await runMini(...args.split(" "));

		expect(result.exitCode).not.toBe(0);
		expect(result.stderr.toString()).not.toContain("Definition of Done");
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

	it("publishes only long allowed options and no excluded help concepts", async () => {
		const results = await Promise.all([
			runMini("task", "create", "--help"),
			runMini("task", "edit", "--help"),
			runMini("task", "list", "--help"),
			runMini("search", "--help"),
		]);
		const output = results.map((result) => result.stdout.toString()).join("\n");

		for (const result of results) expect(result.exitCode).toBe(0);
		for (const allowed of ["--description", "--assignee", "--depends-on", "--ac", "--sort", "--type"]) {
			expect(output).toContain(allowed);
		}
		expect(output).not.toMatch(/(^|\s)--desc(?:\s|$)/m);
		expect(output).not.toMatch(/(^|\s)--dep(?:\s|$)/m);
		for (const hidden of [
			"-a,",
			"-d,",
			"due-date",
			"project",
			"Definition of Done",
			"implementation",
			"decision",
			"archive",
		]) {
			expect(output).not.toContain(hidden);
		}
	});
});
