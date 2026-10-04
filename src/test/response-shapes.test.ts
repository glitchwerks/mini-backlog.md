import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inspectToolResponse, observeShape, textOutline } from "../../scripts/response-shapes.ts";
import { captureResponses } from "../../scripts/surface-manifest.ts";

test("retains nullable and missing fields relative to their object parents", () => {
	expect(
		observeShape([
			{
				tasks: [
					{ title: "one", date: null },
					{ title: "two", date: "today", extra: 2 },
				],
			},
		]),
	).toEqual([
		{ path: "$", types: ["object"], optional: false },
		{ path: "$/tasks", types: ["array"], optional: false },
		{ path: "$/tasks/*", types: ["object"], optional: false },
		{ path: "$/tasks/*/date", types: ["null", "string"], optional: false },
		{ path: "$/tasks/*/extra", types: ["number"], optional: true },
		{ path: "$/tasks/*/title", types: ["string"], optional: false },
	]);
});

test("ignores generated values without erasing added, removed or changed fields", () => {
	const first = observeShape([{ id: "task-1", created: "2026-01-01", metadata: { priority: null } }]);
	expect(observeShape([{ id: "task-999", created: "2027-01-01", metadata: { priority: null } }])).toEqual(first);
	expect(observeShape([{ id: "task-1", created: 5, metadata: { priority: null } }])).not.toEqual(first);
	expect(observeShape([{ id: "task-1", created: "2026-01-01", metadata: {} }])).not.toEqual(first);
	expect(
		observeShape([{ id: "task-1", created: "2026-01-01", metadata: { priority: null, due: "tomorrow" } }]),
	).not.toEqual(first);
	expect(observeShape([{ result: { id: "task-1", created: "2026-01-01", metadata: { priority: null } } }])).not.toEqual(
		first,
	);
});

test("escapes path separators and preserves empty arrays and mixed element types", () => {
	expect(observeShape([{ "a/b~c": [], values: [true, 3, "x", null] }])).toEqual([
		{ path: "$", types: ["object"], optional: false },
		{ path: "$/a~1b~0c", types: ["array"], optional: false },
		{ path: "$/values", types: ["array"], optional: false },
		{ path: "$/values/*", types: ["boolean", "null", "number", "string"], optional: false },
	]);
});

test("records plain output field labels while ignoring timestamps, IDs and paths", () => {
	expect(
		textOutline("Task task-1 - Sparse\nStatus: To Do\nCreated: 2026-01-01\nFile: /tmp/first\n\nDescription:\nhello"),
	).toEqual(["Created", "Description", "File", "Status"]);
	expect(
		textOutline("Task task-99 - Sparse\nStatus: To Do\nCreated: 2027-01-01\nFile: C:/second\n\nDescription:\nhello"),
	).toEqual(["Created", "Description", "File", "Status"]);
	expect(textOutline("Status: To Do\nDue: tomorrow")).toEqual(["Due", "Status"]);
});

test("preserves unknown raw MCP fields rather than the validator projection", () => {
	const raw = { content: [{ type: "text", text: "Status: To Do", newField: 42 }], newEnvelopeField: true };
	const inspected = inspectToolResponse(raw);
	expect(inspected.value).toBe(raw);
	expect(observeShape([inspected.value])).toContainEqual({
		path: "$/content/*/newField",
		types: ["number"],
		optional: false,
	});
	expect(observeShape([inspected.value])).toContainEqual({
		path: "$/newEnvelopeField",
		types: ["boolean"],
		optional: false,
	});
	expect(() => inspectToolResponse({})).toThrow(/content/);
});

test("normalizes numbered headings without hiding their names", () => {
	expect(textOutline("Milestones (0):\nMilestones found on tasks without files (1):")).toEqual([
		"Milestones (count)",
		"Milestones found on tasks without files (count)",
	]);
	expect(textOutline("Milestones (3):")).toEqual(textOutline("Milestones (1):"));
	expect(textOutline("Releases (1):")).not.toEqual(textOutline("Milestones (1):"));
});

test("probes a real build repeatably without mutating the selected project", async () => {
	const directory = await mkdtemp(join(tmpdir(), "response-caller-"));
	try {
		const target = {
			command: [process.execPath, resolve("src/bin/cli.ts")],
			cwd: directory,
			label: "mini",
			timeoutMs: 10000,
		};
		const first = await captureResponses(target);
		expect(first.profileVersion).toBe(1);
		expect(first.probes["cli.task.view.json"]?.fields).toContainEqual({
			path: "$/task/priority",
			types: ["null", "string"],
			optional: false,
		});
		expect(first.probes["cli.task.view.json"]?.fields).toContainEqual({
			path: "$/task/acceptanceCriteria/*/checked",
			types: ["boolean"],
			optional: false,
		});
		expect(first.probes["cli.task.view.json"]?.fields).toContainEqual({
			path: "$/task/comments/*/author",
			types: ["null", "string"],
			optional: false,
		});
		expect(first.probes["mcp.task.complete"]?.contentTypes).toEqual(["text"]);
		expect(first.probes["mcp.document.view"]?.labels).toContain("Tags");
		expect(first.probes["mcp.task.view"]?.labels).toContain("Status");
		expect(await captureResponses(target)).toEqual(first);
		expect(await Bun.file(join(directory, "backlog/config.yml")).exists()).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 60000);

test("removes only its disposable fixture when initialization fails", async () => {
	const directory = await mkdtemp(join(tmpdir(), "response-failure-"));
	const record = join(directory, "cwd.txt");
	try {
		const code = `await Bun.write(${JSON.stringify(record)}, process.cwd()); process.exit(1);`;
		await expect(
			captureResponses({ command: [process.execPath, "--eval", code], cwd: directory, label: "failure" }),
		).rejects.toThrow(/failed/);
		const fixture = await readFile(record, "utf8");
		expect(fixture).not.toBe(directory);
		expect(await Bun.file(join(fixture, "backlog/config.yml")).exists()).toBe(false);
		await expect(stat(fixture)).rejects.toThrow();
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test.each(["mcp", "json"])("cleans the initialized fixture after a %s failure", async (failure) => {
	const directory = await mkdtemp(join(tmpdir(), "response-post-init-"));
	const record = join(directory, "cwd.txt");
	const wrapper = join(directory, "wrapper.ts");
	try {
		await writeFile(
			wrapper,
			`
const args = process.argv.slice(2);
if (${JSON.stringify(failure)} === "mcp" ? args[0] === "mcp" : args[0] === "task" && args[1] === "list") {
	await Bun.write(${JSON.stringify(record)}, process.cwd());
	console.log("invalid response");
	process.exit(${failure === "mcp" ? 1 : 0});
}
const child = Bun.spawn([process.execPath, ${JSON.stringify(resolve("src/bin/cli.ts"))}, ...args], { cwd: process.cwd(), env: process.env, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
process.exit(await child.exited);
`,
		);
		await expect(
			captureResponses({ command: [process.execPath, wrapper], cwd: directory, label: "failure", timeoutMs: 2000 }),
		).rejects.toThrow();
		const fixture = await readFile(record, "utf8");
		await expect(stat(fixture)).rejects.toThrow();
		expect((await stat(directory)).isDirectory()).toBe(true);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 20000);
