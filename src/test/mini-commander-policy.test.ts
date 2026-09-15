import { describe, expect, it } from "bun:test";
import { Command } from "commander";
import { applyMiniCommanderPolicy } from "../mini/commander-policy.ts";
import { MINI_CLI_OPTIONS } from "../mini/surface-policy.ts";

function commandPaths(command: Command, prefix = ""): string[] {
	return command.commands.flatMap((child) => {
		const path = prefix ? `${prefix} ${child.name()}` : child.name();
		return [path, ...commandPaths(child, path)];
	});
}

describe("mini Commander policy", () => {
	it("keeps the exact allowlisted graph and rejects future additions by default", () => {
		const program = new Command().name("backlog").version("1.0.0", "-v, --version");
		program
			.command("task")
			.alias("tasks")
			.command("create [title]")
			.option("-d, --description <text>")
			.option("--future");
		program.commands.find((command) => command.name() === "task")?.command("archive <id>");
		program.command("future-command");

		applyMiniCommanderPolicy(program);

		expect(commandPaths(program)).toEqual(["task", "task create"]);
		expect(program.commands[0]?.aliases()).toEqual([]);
		const create = program.commands[0]?.commands[0];
		expect(create?.options.map((option) => option.long)).toEqual(["--description"]);
		expect(create?.options[0]?.short).toBeUndefined();
		expect(create?.registeredArguments[0]?.required).toBe(true);
		expect(Object.isFrozen(MINI_CLI_OPTIONS)).toBe(true);
		expect(Object.values(MINI_CLI_OPTIONS).every(Object.isFrozen)).toBe(true);
	});
});
