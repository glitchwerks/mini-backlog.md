import type { Argument, Command } from "commander";
import { MINI_CLI_DESCRIPTIONS, MINI_CLI_OPTIONS } from "./surface-policy.ts";

function commandPath(command: Command): string {
	const parts: string[] = [];
	let current: Command | null = command;
	while (current?.parent) {
		parts.unshift(current.name());
		current = current.parent;
	}
	return parts.join(" ");
}

function walkCommands(command: Command): Command[] {
	return [command, ...command.commands.flatMap(walkCommands)];
}

function hasAllowedPath(path: string, childName: string): boolean {
	return Object.hasOwn(MINI_CLI_OPTIONS, path ? `${path} ${childName}` : childName);
}

function findCommand(program: Command, path: string): Command | undefined {
	return walkCommands(program).find((command) => commandPath(command) === path);
}

function requireArgument(command: Command | undefined, index: number): void {
	const argument = command?.registeredArguments[index] as Argument | undefined;
	if (argument) argument.required = true;
}

function pruneChildren(command: Command, path: string): void {
	const commands = command.commands as Command[];
	commands.splice(0, commands.length, ...commands.filter((child) => hasAllowedPath(path, child.name())));
	for (const child of command.commands) pruneChildren(child, path ? `${path} ${child.name()}` : child.name());
}

export function applyMiniCommanderPolicy(program: Command): void {
	pruneChildren(program, "");
	for (const command of walkCommands(program)) {
		const path = commandPath(command);
		const allowed = new Set<string>(MINI_CLI_OPTIONS[path as keyof typeof MINI_CLI_OPTIONS] ?? []);
		const options = command.options as NonNullable<Command["options"]> extends readonly (infer T)[] ? T[] : never;
		options.splice(0, options.length, ...options.filter((option) => option.long && allowed.has(option.long)));
		command.aliases([]);
		const eventEmitter = command as Command & { removeAllListeners(event: string): void };
		for (const event of ["beforeHelp", "afterHelp", "beforeAllHelp", "afterAllHelp"])
			eventEmitter.removeAllListeners(event);
		command.description(MINI_CLI_DESCRIPTIONS[path as keyof typeof MINI_CLI_DESCRIPTIONS]);
		command.helpOption("--help", "display help for command");
		for (const option of command.options) option.short = undefined;
	}
	requireArgument(findCommand(program, "task create"), 0);
	requireArgument(findCommand(program, "task edit"), 0);
}
