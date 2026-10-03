import { stat } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

export interface CaptureTarget {
	command: string[];
	cwd: string;
	label: string;
	revision?: string;
	timeoutMs?: number;
}

export interface CliCommandSurface {
	path: string[];
	aliases: string[];
	arguments: string[];
	options: { flags: string[]; argument: string | null }[];
}

interface ParsedHelp {
	command: CliCommandSurface;
	children: { name: string; aliases: string[]; arguments: string[]; builtinHelp: boolean }[];
}

/** Parse the public Commander help layout; fail on unrecognized discovery entries. */
export function parseCliHelp(help: string, path: string[] = [], aliases: string[] = []): ParsedHelp {
	const lines = help.replace(/\r\n/g, "\n").split("\n");
	const usage = lines.find((line) => line.startsWith("Usage: "));
	if (!usage) throw new Error(`Missing CLI Usage line for '${path.join(" ") || "root"}'.`);
	const syntax = usage.slice("Usage: ".length).trim().split(/\s+/);
	if (!syntax[0] || path.some((part, index) => syntax[index + 1]?.split("|")[0] !== part)) {
		throw new Error(`Unexpected CLI Usage line for '${path.join(" ") || "root"}'.`);
	}
	const args = syntax.slice(path.length + 1);
	if (args.some((arg) => !/^(?:<[^<>]+>|\[[^[\]]+\])$/.test(arg))) {
		throw new Error(`Unrecognized CLI argument syntax in '${usage}'.`);
	}
	const command: CliCommandSurface = {
		path,
		aliases: [...aliases].sort(),
		arguments: args.filter((arg) => arg !== "[options]" && arg !== "[command]"),
		options: [],
	};
	const children: ParsedHelp["children"] = [];
	let section = "";
	let foundOptions = false;
	let continuationColumn: number | null = null;
	for (const line of lines) {
		if (/^[\w -]+:$/.test(line)) {
			section = line.slice(0, -1);
			continuationColumn = null;
			if (section === "Options") foundOptions = true;
			continue;
		}
		const columns = line.match(/^ {2}(\S.*)$/)?.[1]?.split(/ {2,}/);
		const entry = columns?.[0]?.trim();
		if (!entry) {
			if ((section === "Options" || section === "Commands") && line.trim()) {
				const indentation = line.match(/^ */)?.[0].length ?? 0;
				if (continuationColumn === null || indentation !== continuationColumn) {
					throw new Error(`Unrecognized CLI ${section} layout: '${line.trim()}'.`);
				}
			}
			continue;
		}
		const description = columns?.[1];
		continuationColumn = description ? line.lastIndexOf(description) : null;
		if (section === "Options") {
			const option = entry.match(/^(-[\w?](?:, --[\w-]+)?|--[\w-]+)(?: (\[[^\]]+\]|<[^>]+>))?$/);
			if (!option?.[1]) throw new Error(`Unrecognized CLI option '${entry}'.`);
			command.options.push({ flags: option[1].split(/,\s*/).sort(), argument: option[2] ?? null });
		} else if (section === "Commands") {
			const names = entry.split(/\s/)[0]?.split("|") ?? [];
			if (!names.length || names.some((name) => !/^[\w-]+$/.test(name))) {
				throw new Error(`Unrecognized CLI command '${entry}'.`);
			}
			const [name, ...commandAliases] = names;
			if (!name || children.some((child) => child.name === name)) {
				throw new Error(`Duplicate CLI command '${entry}'.`);
			}
			const childArguments = entry
				.split(/\s+/)
				.slice(1)
				.filter((arg) => arg !== "[options]" && arg !== "[command]");
			const builtinHelp = name === "help" && entry === "help [command]" && columns?.[1] === "display help for command";
			children.push({
				name,
				aliases: commandAliases.sort(),
				arguments: builtinHelp ? ["[command]"] : childArguments,
				builtinHelp,
			});
		}
	}
	if (!foundOptions) throw new Error(`Missing CLI Options section for '${path.join(" ") || "root"}'.`);
	if (command.options.length === 0) throw new Error(`Missing CLI Options entries for '${path.join(" ") || "root"}'.`);
	if (args.includes("[command]") && children.length === 0) {
		throw new Error(`Missing CLI Commands entries for '${path.join(" ") || "root"}'.`);
	}
	command.options.sort((a, b) => compare(a.flags.join(","), b.flags.join(",")));
	children.sort((a, b) => compare(a.name, b.name));
	return { command, children };
}

function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/** Sort object keys recursively while preserving schema array order and constraints. */
export function canonicalJson(value: unknown): string {
	function ordered(item: unknown): unknown {
		if (Array.isArray(item)) return item.map(ordered);
		if (item !== null && typeof item === "object") {
			return Object.fromEntries(
				Object.entries(item)
					.sort(([a], [b]) => compare(a, b))
					.map(([key, entry]) => [key, ordered(entry)]),
			);
		}
		return item;
	}
	return `${JSON.stringify(ordered(value), null, 2)}\n`;
}

export async function validateTarget(value: unknown): Promise<CaptureTarget> {
	if (!value || typeof value !== "object") throw new Error("Target must be a JSON object.");
	const target = value as Partial<CaptureTarget>;
	if (
		!Array.isArray(target.command) ||
		target.command.length === 0 ||
		target.command.some((part) => typeof part !== "string" || part.length === 0)
	) {
		throw new Error("Target command must be a nonempty executable/argument array.");
	}
	if (typeof target.cwd !== "string" || !isAbsolute(target.cwd) || !(await stat(target.cwd)).isDirectory()) {
		throw new Error("Target cwd must be an existing absolute project directory.");
	}
	if (typeof target.label !== "string" || !target.label.trim()) throw new Error("Target label is required.");
	if (target.revision !== undefined && typeof target.revision !== "string")
		throw new Error("Target revision must be a string.");
	if (
		target.timeoutMs !== undefined &&
		(!Number.isInteger(target.timeoutMs) || target.timeoutMs < 1 || target.timeoutMs > 60_000)
	) {
		throw new Error("Target timeoutMs must be an integer between 1 and 60000.");
	}
	return {
		command: target.command,
		cwd: target.cwd,
		label: target.label,
		...(target.revision === undefined ? {} : { revision: target.revision }),
		timeoutMs: target.timeoutMs ?? 10_000,
	};
}

function environment(cwd: string): Record<string, string> {
	return {
		...getDefaultEnvironment(),
		BACKLOG_CWD: cwd,
		NO_COLOR: "1",
		FORCE_COLOR: "0",
		COLUMNS: "120",
		TERM: "dumb",
	};
}

async function runCli(target: CaptureTarget, args: string[]): Promise<string> {
	const child = Bun.spawn([...target.command, ...args], {
		cwd: target.cwd,
		env: environment(target.cwd),
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	let timedOut = false;
	let killTimer: ReturnType<typeof setTimeout> | undefined;
	const timer = setTimeout(() => {
		timedOut = true;
		child.kill("SIGTERM");
		killTimer = setTimeout(() => {
			if (child.exitCode === null) child.kill("SIGKILL");
		}, 250);
	}, target.timeoutMs);
	try {
		const [exitCode, stdout, stderr] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		if (timedOut) throw new Error(`CLI discovery timed out: ${args.join(" ")}.`);
		if (exitCode !== 0) throw new Error(`CLI discovery failed (${exitCode}): ${args.join(" ")}. ${stderr.trim()}`);
		return stdout;
	} finally {
		clearTimeout(timer);
		clearTimeout(killTimer);
		if (child.exitCode === null) child.kill("SIGKILL");
		await child.exited;
	}
}

async function discoverCli(target: CaptureTarget): Promise<CliCommandSurface[]> {
	const commands: CliCommandSurface[] = [];
	const pending = [{ path: [] as string[], aliases: [] as string[] }];
	while (pending.length) {
		const next = pending.shift();
		if (!next) break;
		if (commands.length >= 500 || next.path.length > 20)
			throw new Error("CLI discovery exceeded its command/depth limit.");
		const parsed = parseCliHelp(await runCli(target, [...next.path, "--help"]), next.path, next.aliases);
		commands.push(parsed.command);
		for (const child of parsed.children) {
			if (child.builtinHelp) {
				commands.push({
					path: [...next.path, child.name],
					aliases: child.aliases,
					arguments: child.arguments,
					options: [],
				});
			} else {
				pending.push({ path: [...next.path, child.name], aliases: child.aliases });
			}
		}
	}
	return commands.sort((a, b) => compare(a.path.join(" "), b.path.join(" ")));
}

/** Follow discovery cursors until exhaustion; loops and duplicate identities are errors. */
export async function collectPages<T>(
	list: (cursor?: string) => Promise<{ items: T[]; nextCursor?: string }>,
	identity: (item: T) => string,
): Promise<T[]> {
	const items: T[] = [];
	const cursors = new Set<string>();
	const identities = new Set<string>();
	let cursor: string | undefined;
	for (let page = 0; page < 500; page++) {
		const result = await list(cursor);
		if (!Array.isArray(result.items)) throw new Error("Malformed MCP discovery page.");
		for (const item of result.items) {
			const key = identity(item);
			if (typeof key !== "string" || !key || identities.has(key))
				throw new Error(`Invalid or duplicate MCP discovery identity '${key}'.`);
			identities.add(key);
			items.push(item);
		}
		if (result.nextCursor === undefined) return items.sort((a, b) => compare(identity(a), identity(b)));
		if (typeof result.nextCursor !== "string" || !result.nextCursor || cursors.has(result.nextCursor)) {
			throw new Error("Invalid or repeated MCP discovery cursor.");
		}
		cursors.add(result.nextCursor);
		cursor = result.nextCursor;
	}
	throw new Error("MCP discovery exceeded its page limit.");
}

async function discoverMcp(target: CaptureTarget) {
	const command = target.command[0];
	if (!command) throw new Error("Missing target command.");
	const transport = new StdioClientTransport({
		command,
		args: [...target.command.slice(1), "mcp", "start"],
		cwd: target.cwd,
		env: environment(target.cwd),
		stderr: "pipe",
	});
	transport.stderr?.on("data", () => {});
	const client = new Client({ name: "backlog-surface-capture", version: "1.0.0" });
	const options = { timeout: target.timeoutMs };
	try {
		await client.connect(transport, options);
		const capabilities = client.getServerCapabilities();
		const tools = capabilities?.tools
			? await collectPages(
					async (cursor) => {
						// Discovery must retain schema references without compiling validators for tools we never invoke.
						const result = await client.request(
							{ method: "tools/list", ...(cursor === undefined ? {} : { params: { cursor } }) },
							ListToolsResultSchema,
							options,
						);
						return { items: result.tools, nextCursor: result.nextCursor };
					},
					(tool) => tool.name,
				)
			: [];
		const resources = capabilities?.resources
			? await collectPages(
					async (cursor) => {
						const result = await client.listResources(cursor === undefined ? undefined : { cursor }, options);
						return { items: result.resources, nextCursor: result.nextCursor };
					},
					(resource) => resource.uri,
				)
			: [];
		const resourceTemplates = capabilities?.resources
			? await collectPages(
					async (cursor) => {
						const result = await client.listResourceTemplates(cursor === undefined ? undefined : { cursor }, options);
						return { items: result.resourceTemplates, nextCursor: result.nextCursor };
					},
					(template) => template.uriTemplate,
				)
			: [];
		const prompts = capabilities?.prompts
			? await collectPages(
					async (cursor) => {
						const result = await client.listPrompts(cursor === undefined ? undefined : { cursor }, options);
						return { items: result.prompts, nextCursor: result.nextCursor };
					},
					(prompt) => prompt.name,
				)
			: [];
		return { server: client.getServerVersion(), surface: { tools, resources, resourceTemplates, prompts } };
	} finally {
		await client.close();
		await transport.close();
	}
}

export async function captureSurface(target: CaptureTarget) {
	const validated = await validateTarget(target);
	const cliVersion = (await runCli(validated, ["--version"])).trim();
	if (!cliVersion || cliVersion.includes("\n")) throw new Error("Invalid CLI version output.");
	const cli = await discoverCli(validated);
	const mcp = await discoverMcp(validated);
	return {
		manifestVersion: 1,
		identity: {
			label: target.label,
			...(target.revision === undefined ? {} : { revision: target.revision }),
			cliVersion,
			mcpServer: mcp.server,
		},
		surface: { cli, mcp: mcp.surface },
	};
}
