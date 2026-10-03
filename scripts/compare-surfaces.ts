import { randomUUID } from "node:crypto";
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	ListPromptsResultSchema,
	ListResourcesResultSchema,
	ListResourceTemplatesResultSchema,
	ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { canonicalJson } from "./surface-manifest.ts";

const nonempty = z.string().min(1);
const object = z.object({}).passthrough();
const profileOneProbes = [
	"cli.doc.list.plain",
	"cli.doc.view.plain",
	"cli.milestone.list.plain",
	"cli.search.json",
	"cli.task.create.plain",
	"cli.task.list.json",
	"cli.task.view.json",
	"cli.task.view.plain",
	"mcp.document.create",
	"mcp.document.list",
	"mcp.document.search",
	"mcp.document.update",
	"mcp.document.view",
	"mcp.milestone.add",
	"mcp.milestone.list",
	"mcp.milestone.remove",
	"mcp.milestone.rename",
	"mcp.task.complete",
	"mcp.task.create",
	"mcp.task.edit",
	"mcp.task.list",
	"mcp.task.search",
	"mcp.task.view",
].sort();
const field = z
	.object({
		path: nonempty,
		types: z.array(z.enum(["object", "array", "null", "string", "number", "boolean"])).min(1),
		optional: z.boolean(),
	})
	.passthrough();
const responses = z
	.object({
		profileVersion: z.literal(1),
		probes: z.record(
			nonempty,
			z
				.object({
					fields: z.array(field).min(1),
					labels: z.array(z.string()),
					textForms: z.array(z.array(z.string())),
					contentTypes: z.array(z.string()),
				})
				.passthrough(),
		),
	})
	.passthrough();
const schema = z
	.object({
		manifestVersion: z.union([z.literal(1), z.literal(2)]),
		identity: z
			.object({
				label: nonempty,
				cliVersion: nonempty,
				mcpServer: z.object({ name: nonempty, version: nonempty }).passthrough(),
			})
			.passthrough(),
		surface: z
			.object({
				cli: z
					.array(
						z
							.object({
								path: z.array(nonempty),
								aliases: z.array(nonempty),
								arguments: z.array(nonempty),
								options: z.array(
									z.object({ flags: z.array(nonempty).min(1), argument: z.string().nullable() }).passthrough(),
								),
							})
							.passthrough(),
					)
					.min(1),
				mcp: z
					.object({
						tools: z.array(z.object({ name: nonempty, inputSchema: object }).passthrough()),
						resources: z.array(z.object({ uri: nonempty }).passthrough()),
						resourceTemplates: z.array(z.object({ uriTemplate: nonempty }).passthrough()),
						prompts: z.array(z.object({ name: nonempty }).passthrough()),
					})
					.passthrough(),
				responses: responses.optional(),
			})
			.passthrough(),
	})
	.passthrough();

function keyed<T>(items: T[], key: (item: T) => string): Record<string, T> {
	const entries = items.map((item) => [key(item), item] as const);
	if (new Set(entries.map(([name]) => name)).size !== items.length) throw new Error("Duplicate surface identity.");
	return Object.fromEntries(entries);
}

export function validateManifest(value: unknown) {
	const manifest = schema.parse(value);
	if (manifest.manifestVersion === 2 && !manifest.surface.responses)
		throw new Error("Version 2 requires response probes.");
	if (manifest.manifestVersion === 1 && manifest.surface.responses)
		throw new Error("Version 1 cannot contain response probes.");
	if (!manifest.surface.cli.some((command) => command.path.length === 0)) throw new Error("Missing root CLI command.");
	keyed(manifest.surface.cli, (command) => command.path.join(" "));
	for (const command of manifest.surface.cli) {
		keyed(command.options, (option) => option.flags.join(","));
		if (
			command.path.length > 1 &&
			!manifest.surface.cli.some((parent) => parent.path.join(" ") === command.path.slice(0, -1).join(" "))
		)
			throw new Error("Missing parent CLI command.");
	}
	// Validate protocol discovery records, but retain the unprojected snapshot for comparison.
	ListToolsResultSchema.parse({ tools: manifest.surface.mcp.tools });
	ListResourcesResultSchema.parse({ resources: manifest.surface.mcp.resources });
	ListResourceTemplatesResultSchema.parse({ resourceTemplates: manifest.surface.mcp.resourceTemplates });
	ListPromptsResultSchema.parse({ prompts: manifest.surface.mcp.prompts });
	keyed(manifest.surface.mcp.tools, (item) => item.name);
	keyed(manifest.surface.mcp.resources, (item) => item.uri);
	keyed(manifest.surface.mcp.resourceTemplates, (item) => item.uriTemplate);
	keyed(manifest.surface.mcp.prompts, (item) => item.name);
	if (manifest.surface.responses) {
		if (canonicalJson(Object.keys(manifest.surface.responses.probes).sort()) !== canonicalJson(profileOneProbes))
			throw new Error("Incomplete or unexpected response profile probes.");
		for (const probe of Object.values(manifest.surface.responses.probes)) {
			keyed(probe.fields, (entry) => entry.path);
			if (!probe.fields.some((entry) => entry.path === "$")) throw new Error("Missing response root field.");
			for (const entry of probe.fields) {
				if (entry.path === "$") continue;
				if (!entry.path.startsWith("$/")) throw new Error("Invalid response field path.");
				const parent = entry.path.slice(0, entry.path.lastIndexOf("/"));
				if (!probe.fields.some((field) => field.path === parent)) throw new Error("Missing parent response field.");
			}
		}
	}
	return manifest;
}

function surfaceForComparison(manifest: ReturnType<typeof validateManifest>) {
	const { cli, mcp, responses: responseSurface, ...additional } = manifest.surface;
	return {
		...additional,
		cli: keyed(
			cli.map((command) => ({ ...command, options: keyed(command.options, (option) => option.flags.join(",")) })),
			(command) => command.path.join(" ") || "(root)",
		),
		mcp: {
			...mcp,
			tools: keyed(mcp.tools, (item) => item.name),
			resources: keyed(mcp.resources, (item) => item.uri),
			resourceTemplates: keyed(mcp.resourceTemplates, (item) => item.uriTemplate),
			prompts: keyed(mcp.prompts, (item) => item.name),
		},
		...(responseSurface
			? {
					responses: {
						...responseSurface,
						probes: Object.fromEntries(
							Object.entries(responseSurface.probes).map(([name, probe]) => [
								name,
								{ ...probe, fields: keyed(probe.fields, (entry) => entry.path) },
							]),
						),
					},
				}
			: {}),
	};
}

export interface SurfaceChange {
	kind: "added" | "removed" | "changed";
	path: string;
	before?: unknown;
	after?: unknown;
}

export function compareSurfaces(beforeValue: unknown, afterValue: unknown) {
	const before = validateManifest(beforeValue);
	const after = validateManifest(afterValue);
	if (before.manifestVersion !== after.manifestVersion) throw new Error("Incompatible manifest versions.");
	if (before.surface.responses?.profileVersion !== after.surface.responses?.profileVersion)
		throw new Error("Incompatible response profiles.");
	const changes: SurfaceChange[] = [];
	function diff(a: unknown, b: unknown, path: string): void {
		if (canonicalJson(a) === canonicalJson(b)) return;
		if (
			a !== null &&
			b !== null &&
			typeof a === "object" &&
			typeof b === "object" &&
			!Array.isArray(a) &&
			!Array.isArray(b)
		) {
			const left = a as Record<string, unknown>;
			const right = b as Record<string, unknown>;
			for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
				const child = `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
				if (!Object.hasOwn(left, key)) changes.push({ kind: "added", path: child, after: right[key] });
				else if (!Object.hasOwn(right, key)) changes.push({ kind: "removed", path: child, before: left[key] });
				else diff(left[key], right[key], child);
			}
		} else changes.push({ kind: "changed", path, before: a, after: b });
	}
	diff(surfaceForComparison(before), surfaceForComparison(after), "");
	return {
		reportVersion: 1,
		manifestVersion: before.manifestVersion,
		before: before.identity,
		after: after.identity,
		changes,
	};
}

export function renderComparison(report: ReturnType<typeof compareSurfaces>): string {
	const safe = (value: string) =>
		value
			.replace(/[\r\n]/g, " ")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\|/g, "\\|")
			.replace(/`/g, "&#96;");
	const display = (value: unknown) => safe(value === undefined ? "—" : JSON.stringify(value));
	const lines = [
		"# Runtime surface comparison",
		"",
		`${safe(report.before.label)} → ${safe(report.after.label)}`,
		"",
		`Manifest version: ${report.manifestVersion}. Changes: ${report.changes.length}.`,
		"",
	];
	if (!report.changes.length) lines.push("No surface changes.");
	else {
		lines.push("| Change | Path | Before | After |", "| --- | --- | --- | --- |");
		for (const change of report.changes)
			lines.push(`| ${change.kind} | ${safe(change.path)} | ${display(change.before)} | ${display(change.after)} |`);
	}
	return `${lines.join("\n")}\n`;
}

/** Stage complete reports and protect input files, including filesystem aliases. */
export async function writeComparison(
	report: ReturnType<typeof compareSurfaces>,
	prefix: string,
	inputFiles: string[],
	candidate?: unknown,
) {
	const output = resolve(prefix);
	await mkdir(dirname(output), { recursive: true });
	const pathKey = (path: string) => (process.platform === "win32" ? path.toLowerCase() : path);
	const inputs = await Promise.all(
		inputFiles.map(async (path) => ({ path: pathKey(await realpath(path)), info: await stat(path) })),
	);
	const contents = [canonicalJson(report), renderComparison(report)];
	const files = [`${output}.json`, `${output}.md`];
	if (candidate !== undefined) {
		files.push(`${output}.candidate.json`);
		contents.push(canonicalJson(candidate));
	}
	for (const file of files) {
		try {
			const resolved = pathKey(await realpath(file));
			const info = await stat(file);
			if (
				inputs.some((input) => input.path === resolved || (input.info.dev === info.dev && input.info.ino === info.ino))
			)
				throw new Error("Report output cannot overwrite an input manifest.");
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		}
	}
	const temporaries = files.map((path) => `${path}.${randomUUID()}.tmp`);
	try {
		for (const [index, content] of contents.entries())
			await writeFile(temporaries[index] as string, content, { flag: "wx" });
		for (const [index, path] of files.entries()) await rename(temporaries[index] as string, path);
	} finally {
		await Promise.all(temporaries.map((path) => rm(path, { force: true })));
	}
	return output;
}

if (import.meta.main) {
	try {
		const { values } = parseArgs({
			args: process.argv.slice(2),
			options: {
				before: { type: "string" },
				after: { type: "string" },
				output: { type: "string" },
				"fail-on-drift": { type: "boolean" },
				help: { type: "boolean" },
			},
			strict: true,
			allowPositionals: false,
		});
		if (values.help)
			console.log(
				"Usage: bun scripts/compare-surfaces.ts --before <manifest.json> --after <manifest.json> --output <docs/report-prefix> [--fail-on-drift]",
			);
		else {
			if (!values.before || !values.after || !values.output)
				throw new Error("--before, --after and --output are required.");
			const report = compareSurfaces(
				JSON.parse(await readFile(values.before, "utf8")),
				JSON.parse(await readFile(values.after, "utf8")),
			);
			const output = await writeComparison(report, values.output, [values.before, values.after]);
			console.log(`Surface changes: ${report.changes.length}. Reports: ${output}.json / .md`);
			if (values["fail-on-drift"] && report.changes.length) process.exitCode = 1;
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
