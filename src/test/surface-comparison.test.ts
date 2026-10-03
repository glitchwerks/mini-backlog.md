import { expect, test } from "bun:test";
import { link, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { compareSurfaces, renderComparison, writeComparison } from "../../scripts/compare-surfaces.ts";

function manifest() {
	return {
		manifestVersion: 1,
		identity: { label: "before", cliVersion: "1.0", mcpServer: { name: "fixture", version: "1.0" } },
		surface: {
			cli: [{ path: [], aliases: [], arguments: [], options: [{ flags: ["--help", "-h"], argument: null }] }],
			mcp: {
				tools: [
					{
						name: "task_view",
						inputSchema: { type: "object", properties: { id: { type: "string", enum: ["one"] } }, required: ["id"] },
					},
				],
				resources: [],
				resourceTemplates: [],
				prompts: [],
			},
		},
	};
}

function first<T>(items: T[]): T {
	const value = items[0];
	if (value === undefined) throw new Error("Missing test fixture item.");
	return value;
}

test("build identities do not cause drift", () => {
	const before = manifest();
	const after = manifest();
	after.identity = { label: "after", cliVersion: "2.0", mcpServer: { name: "fixture", version: "2.0" } };
	expect(compareSurfaces(before, after).changes).toEqual([]);
});

test("reports options and tools by identity instead of shifted array indexes", () => {
	const before = manifest();
	const after = manifest();
	first(after.surface.cli).options.push({ flags: ["--json"], argument: null });
	after.surface.mcp.tools.push({
		name: "task_list",
		inputSchema: structuredClone(first(before.surface.mcp.tools).inputSchema),
	});
	const changes = compareSurfaces(before, after).changes;
	expect(changes.map((change) => [change.kind, change.path])).toEqual([
		["added", "/cli/(root)/options/--json"],
		["added", "/mcp/tools/task_list"],
	]);
	expect(compareSurfaces(after, before).changes.map((change) => change.kind)).toEqual(["removed", "removed"]);
});

test.each(["required", "type", "enum"])("detects a changed %s constraint", (field) => {
	const before = manifest();
	const after = manifest();
	const schema = first(after.surface.mcp.tools).inputSchema;
	if (field === "required") schema.required = [];
	if (field === "type") schema.properties.id.type = "number";
	if (field === "enum") schema.properties.id.enum = ["two"];
	const changes = compareSurfaces(before, after).changes;
	expect(changes).toHaveLength(1);
	expect(changes[0]?.kind).toBe("changed");
	expect(changes[0]?.path).toContain(field);
});

test("rejects incomplete or incompatible manifests", () => {
	const valid = manifest();
	expect(() => compareSurfaces(valid, { ...valid, manifestVersion: 99 })).toThrow();
	expect(() => compareSurfaces(valid, { ...valid, surface: { ...valid.surface, mcp: { tools: [] } } })).toThrow();
	expect(() => compareSurfaces(valid, { ...valid, manifestVersion: 2 })).toThrow();
	expect(() =>
		compareSurfaces(valid, {
			...valid,
			surface: { ...valid.surface, cli: [...valid.surface.cli, ...valid.surface.cli] },
		}),
	).toThrow(/duplicate/i);
	expect(() =>
		compareSurfaces(valid, {
			...valid,
			surface: { ...valid.surface, mcp: { ...valid.surface.mcp, tools: [{ name: "broken", inputSchema: {} }] } },
		}),
	).toThrow();
	expect(() =>
		compareSurfaces(valid, {
			...valid,
			surface: {
				...valid.surface,
				cli: [...valid.surface.cli, { ...first(valid.surface.cli), path: ["task", "view"] }],
			},
		}),
	).toThrow(/parent/i);
});

test("renders deterministic Markdown with escaped build labels", () => {
	const before = manifest();
	const after = manifest();
	after.identity.label = "after | unsafe\nheading";
	const report = compareSurfaces(before, after);
	expect(renderComparison(report)).toContain("No surface changes");
	expect(renderComparison(report)).toBe(renderComparison(compareSurfaces(before, after)));
	expect(renderComparison(report)).not.toContain("unsafe\nheading");
});

test("detects actual response fields, null/type changes and observed optionality", async () => {
	const baseline = JSON.parse(await readFile("docs/surfaces/mini-v1.53.0.json", "utf8"));
	const candidate = structuredClone(baseline);
	const fields = candidate.surface.responses.probes["cli.task.view.json"].fields as {
		path: string;
		types: string[];
		optional: boolean;
	}[];
	const priority = fields.find((field) => field.path === "$/task/priority");
	if (!priority) throw new Error("Baseline priority field missing.");
	priority.types = ["number"];
	priority.optional = true;
	fields.push({ path: "$/task/newField", types: ["string"], optional: false });
	fields.splice(
		fields.findIndex((field) => field.path === "$/task/title"),
		1,
	);
	const changes = compareSurfaces(baseline, candidate).changes;
	expect(changes.map((change) => [change.kind, change.path])).toEqual([
		["added", "/responses/probes/cli.task.view.json/fields/$~1task~1newField"],
		["changed", "/responses/probes/cli.task.view.json/fields/$~1task~1priority/optional"],
		["changed", "/responses/probes/cli.task.view.json/fields/$~1task~1priority/types"],
		["removed", "/responses/probes/cli.task.view.json/fields/$~1task~1title"],
	]);
	delete candidate.surface.responses.probes["mcp.task.view"];
	expect(() => compareSurfaces(baseline, candidate)).toThrow(/profile probes/);
});

test("comparison CLI flags drift, emits reports and never overwrites its input baseline", async () => {
	const directory = await mkdtemp(join(tmpdir(), "surface-compare-"));
	try {
		const before = join(directory, "baseline.json");
		const after = join(directory, "candidate.json");
		const candidate = manifest();
		first(candidate.surface.cli).options.push({ flags: ["--json"], argument: null });
		const baseline = JSON.stringify(manifest());
		await writeFile(before, baseline);
		await writeFile(after, JSON.stringify(candidate));
		async function run(output: string) {
			const child = Bun.spawn(
				[
					process.execPath,
					resolve("scripts/compare-surfaces.ts"),
					"--before",
					before,
					"--after",
					after,
					"--output",
					output,
					"--fail-on-drift",
				],
				{ stdout: "pipe", stderr: "pipe" },
			);
			const [code] = await Promise.all([
				child.exited,
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
			]);
			return code;
		}
		const output = join(directory, "report");
		expect(await run(output)).toBe(1);
		expect(JSON.parse(await readFile(`${output}.json`, "utf8")).changes).toHaveLength(1);
		expect(await readFile(`${output}.md`, "utf8")).toContain("--json");
		await run(join(directory, "baseline"));
		expect(await readFile(before, "utf8")).toBe(baseline);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

async function aliasProtection(alias: typeof link) {
	const directory = await mkdtemp(join(tmpdir(), "surface-alias-"));
	try {
		const before = join(directory, "baseline.json");
		const output = join(directory, "report");
		const baseline = JSON.stringify(manifest());
		await writeFile(before, baseline);
		await alias(before, `${output}.json`);
		await expect(writeComparison(compareSurfaces(manifest(), manifest()), output, [before])).rejects.toThrow(
			/overwrite/,
		);
		expect(await readFile(before, "utf8")).toBe(baseline);
		expect(await Bun.file(`${output}.md`).exists()).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

test("protects a baseline through a hard-linked report destination", () => aliasProtection(link));
test.skipIf(process.platform === "win32")("protects a baseline through a symbolic-linked report destination", () =>
	aliasProtection(symlink),
);
