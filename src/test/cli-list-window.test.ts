import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../index.ts";
import type { Task } from "../types/index.ts";
import { getTestCliPath } from "./test-cli.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const CLI_PATH = getTestCliPath();

let TEST_DIR: string;

const buildTask = (partial: Partial<Task> & Pick<Task, "id" | "title">): Task => ({
	status: "To Do",
	assignee: [],
	createdDate: "2026-09-01",
	labels: [],
	dependencies: [],
	...partial,
});

async function runCli(args: string[], env: Record<string, string> = {}) {
	const result = await $`bun ${[CLI_PATH, ...args]}`
		.cwd(TEST_DIR)
		.env({ ...process.env, ...env })
		.nothrow()
		.quiet();
	return { exitCode: result.exitCode, stdout: result.stdout.toString(), stderr: result.stderr.toString() };
}

async function runJson(args: string[]) {
	const result = await runCli([...args, "--json"]);
	expect(result.exitCode).toBe(0);
	return JSON.parse(result.stdout);
}

/** Follow numeric hints using the original arguments; the caller identifies a real operand separator. */
async function followWindows(args: string[], beforeSeparator = args.length): Promise<string[]> {
	const outputs: string[] = [];
	let stdout = (await runCli(args)).stdout;
	while (true) {
		outputs.push(stdout);
		const next = stdout.match(/Next: rerun the original command with --skip (\d+)/)?.[1];
		if (!next) return outputs;
		// Appending the actual paging option retains query operands that happen to read --skip.
		const result = await runCli([...args.slice(0, beforeSeparator), "--skip", next, ...args.slice(beforeSeparator)]);
		expect(result.exitCode).toBe(0);
		stdout = result.stdout;
	}
}

function idsIn(output: string, pattern: RegExp): string[] {
	return output.match(pattern) ?? [];
}

function printedLines(output: string): string[] {
	return output.split("\n").filter((line) => line.trim() !== "");
}

/** Joins grouped window outputs, dropping footers and a group heading its previous window already printed. */
function joinGroupedWindows(outputs: string[]): string[] {
	const lines: string[] = [];
	let heading: string | undefined;
	for (const line of outputs.flatMap(printedLines)) {
		if (line.startsWith("Showing ")) continue;
		if (!line.startsWith(" ")) {
			if (line === heading) continue;
			heading = line;
		}
		lines.push(line);
	}
	return lines;
}

describe("CLI list windows", () => {
	beforeAll(async () => {
		TEST_DIR = createUniqueTestDir("test-cli-list-window");
		await mkdir(TEST_DIR, { recursive: true });
		const core = new Core(TEST_DIR);
		await initializeFilesystemTestProject(core, "List Window Test");

		for (const index of [1, 2, 3, 4]) {
			await core.createTask(
				buildTask({
					id: `task-${index}`,
					title: `Window task ${index}`,
					// Searching for `--skip` finds tasks with an option value that reads like the skip option.
					description: 'Read in windows with --skip. It\'s "ready" for $VALUE and `code`.',
					status: index === 2 ? "In Progress" : "To Do",
				}),
				false,
			);
		}
		await core.createTask(buildTask({ id: "task-5", title: "Window task 5", status: "Done", milestone: "m-2" }), false);

		for (const title of ["Release A", "Release B", "Release C"]) {
			await core.filesystem.createMilestone(title);
		}
		for (const index of [1, 2, 3]) {
			await core.filesystem.saveDraft(buildTask({ id: `DRAFT-${index}`, title: `Draft ${index}`, status: "Draft" }));
			await core.filesystem.saveDecision({
				id: `decision-${index}`,
				// A decision titled exactly like the search query outranks the tasks, so relevance order mixes types.
				title: index === 1 ? "Window" : `Decision ${index}`,
				date: "2026-09-01",
				status: "accepted",
				context: "",
				decision: "",
				consequences: "",
				rawContent: "",
			});
		}
		// Two documents share a title, so only their path keeps their order stable.
		await core.createDocument({
			id: "doc-1",
			title: "Guide",
			type: "guide",
			createdDate: "2026-09-01",
			rawContent: "",
		});
		await core.createDocument(
			{ id: "doc-2", title: "Guide", type: "guide", createdDate: "2026-09-01", rawContent: "" },
			false,
			"a",
		);
		await core.createDocument({
			id: "doc-3",
			title: "Handbook",
			type: "guide",
			createdDate: "2026-09-01",
			rawContent: "",
		});
	});

	afterAll(async () => {
		await safeCleanup(TEST_DIR);
	});

	it("pages grouped task output using the continuation hints", async () => {
		const complete = await runCli(["task", "list", "--search", "Window task", "--plain"]);
		expect(complete.stdout).not.toContain("Showing");
		expect(printedLines(complete.stdout).filter((line) => !line.startsWith(" "))).toEqual([
			"To Do:",
			"In Progress:",
			"Done:",
		]);

		const windows = await followWindows(["task", "list", "--search", "Window task", "--max-count", "2", "--plain"]);

		expect(windows).toHaveLength(3);
		expect(windows[0]).toContain(
			"Showing 1-2 of 5 items. Next: rerun the original command with --skip 2 before any -- separator;",
		);
		expect(windows[2]?.trimEnd().endsWith("Showing 5-5 of 5 items.")).toBe(true);
		expect(joinGroupedWindows(windows)).toEqual(printedLines(complete.stdout));
	});

	it("pages plain search output in the order it groups results", async () => {
		const relevance = await runJson(["search", "window"]);
		expect(relevance.results[0].type).toBe("decision");
		const complete = await runCli(["search", "window", "--plain"]);

		const windows = await followWindows(["search", "window", "--max-count", "2", "--plain"]);

		expect(windows.length).toBeGreaterThan(1);
		expect(joinGroupedWindows(windows)).toEqual(printedLines(complete.stdout));
	});

	it("reports total and nextSkip in JSON only for cut output and keeps --limit silent", async () => {
		const middle = await runJson(["task", "list", "--max-count", "2", "--skip", "2"]);
		expect(middle.tasks).toHaveLength(2);
		expect(middle).toMatchObject({ total: 5, nextSkip: 4 });

		const last = await runJson(["task", "list", "--skip", "4"]);
		expect(last.tasks).toHaveLength(1);
		expect(last).toMatchObject({ total: 5, nextSkip: null });

		const complete = await runJson(["task", "list"]);
		expect(complete.tasks).toHaveLength(5);
		expect(Object.keys(complete).sort()).toEqual(["kind", "schemaVersion", "tasks"]);

		const limited = await runJson(["task", "list", "--limit", "2"]);
		expect(limited.tasks).toHaveLength(2);
		expect(limited).not.toHaveProperty("total");
		expect((await runCli(["task", "list", "--limit", "2", "--plain"])).stdout).not.toContain("Showing");

		const limitedWindow = await runCli(["task", "list", "--limit", "4", "--max-count", "3", "--plain"]);
		expect(limitedWindow.stdout).toContain("Showing 1-3 of 4 items.");
	});

	it("windows the flat JSON task array, not the plain status groups", async () => {
		const complete = (await runJson(["task", "list"])).tasks.map((task: { id: string }) => task.id);
		const window = (await runJson(["task", "list", "--max-count", "2", "--skip", "1"])).tasks;

		expect(window.map((task: { id: string }) => task.id)).toEqual(complete.slice(1, 3));
	});

	it("retains option-like query values and an operand separator when following hints", async () => {
		const searched = ["task", "list", "--search", "--skip", "--plain"];
		const complete = await runCli(searched);
		expect(idsIn(complete.stdout, /TASK-\d+/g).length).toBeGreaterThan(2);
		expect(joinGroupedWindows(await followWindows([...searched, "--max-count", "2"]))).toEqual(
			printedLines(complete.stdout),
		);

		const separated = await followWindows(["doc", "list", "--max-count", "1", "--"], 4);
		expect(separated[0]).toContain("Next: rerun the original command with --skip 1 before any -- separator;");
		expect(joinGroupedWindows(separated)).toEqual(printedLines((await runCli(["doc", "list", "--plain"])).stdout));
		const literalSeparator = ["task", "list", "--search", "--", "--plain"];
		expect(joinGroupedWindows(await followWindows([...literalSeparator, "--max-count", "1"]))).toEqual(
			printedLines((await runCli(literalSeparator)).stdout),
		);
	});

	it("keeps the search value when an ancestor flag is interleaved before it", async () => {
		const args = ["task", "list", "--search", "--plain", "--skip", "--status", "To Do"];
		const complete = await runCli(args);
		expect(complete.exitCode).toBe(0);
		expect(idsIn(complete.stdout, /TASK-\d+/g)).toEqual(["TASK-1", "TASK-3", "TASK-4"]);
		const windows = await followWindows([...args, "--max-count", "1"]);
		expect(windows).toHaveLength(3);
		expect(windows[0]).toContain("Next: rerun the original command with --skip 1 before any -- separator;");
		expect(joinGroupedWindows(windows)).toEqual(printedLines(complete.stdout));
	});

	it("keeps spaced filters and shell-sensitive query text when rerunning the original command", async () => {
		const args = ["task", "list", "--search", 'It\'s "ready" for $VALUE and `code`.', "--status", "To Do", "--plain"];
		const complete = await runCli(args);
		expect(complete.exitCode).toBe(0);
		expect(idsIn(complete.stdout, /TASK-\d+/g)).toEqual(["TASK-1", "TASK-3", "TASK-4"]);
		const windows = await followWindows([...args, "--max-count", "1", "--skip=0"]);
		expect(windows).toHaveLength(3);
		expect(joinGroupedWindows(windows)).toEqual(printedLines(complete.stdout));
		expect(windows[0]?.split("\n").find((line) => line.startsWith("Showing "))).toBe(
			"Showing 1-1 of 3 items. Next: rerun the original command with --skip 1 before any -- separator; replace any existing --skip option and keep all other arguments.",
		);
		expect(windows.at(-1)).not.toContain("Next:");
	});

	it("prints only the number of listed items with --count", async () => {
		expect((await runCli(["task", "list", "--count"])).stdout).toBe("5\n");
		expect((await runCli(["task", "list", "--status", "To Do", "--count"])).stdout).toBe("3\n");
		expect((await runCli(["task", "list", "--count", "--skip", "4"])).stdout).toBe("1\n");
		// Bun colors a logged number when color is forced, which would break `$(backlog ... --count)`.
		expect((await runCli(["task", "list", "--count"], { FORCE_COLOR: "1" })).stdout).toBe("5\n");

		const withJson = await runCli(["task", "list", "--count", "--json"]);
		expect(withJson.exitCode).toBe(1);
		expect(withJson.stdout).toBe("");
		expect(withJson.stderr).toContain("--count cannot be combined with --json.");
	});

	it("rejects invalid window values before printing", async () => {
		const zero = await runCli(["task", "list", "--max-count", "0"]);
		expect(zero.exitCode).toBe(1);
		expect(zero.stdout).toBe("");
		expect(zero.stderr).toContain("--max-count must be a positive integer");

		const text = await runCli(["doc", "list", "--skip", "abc"]);
		expect(text.exitCode).toBe(1);
		expect(text.stdout).toBe("");
		expect(text.stderr).toContain("--skip must be a non-negative integer");
	});

	it("prints only the footer for a skip past the end", async () => {
		const result = await runCli(["decision", "list", "--skip", "5"]);
		expect(result.stdout).toBe("Showing 0 of 3 items.\n");
	});

	it("pages search, document search, and decision results", async () => {
		const search = await runCli(["search", "--type", "decision", "--max-count", "2", "--plain"]);
		expect(idsIn(search.stdout, /decision-\d+/g)).toEqual(["decision-1", "decision-2"]);
		expect(search.stdout).toContain(
			"Showing 1-2 of 3 items. Next: rerun the original command with --skip 2 before any -- separator;",
		);
		expect(await runJson(["search", "--type", "decision", "--max-count", "1", "--skip", "1"])).toMatchObject({
			results: [{ type: "decision", data: { id: "decision-2" } }],
			total: 3,
			nextSkip: 2,
		});
		expect((await runCli(["search", "--type", "decision", "--count"])).stdout).toBe("3\n");

		const decisions = await runCli(["decision", "list", "--max-count", "2", "--skip", "2"]);
		expect(idsIn(decisions.stdout, /decision-\d+/g)).toEqual(["decision-3"]);
		expect(decisions.stdout).toContain("Showing 3-3 of 3 items.");
		expect(await runJson(["decision", "list", "--max-count", "1"])).toMatchObject({ total: 3, nextSkip: 1 });

		const documentViews = idsIn((await runCli(["doc", "search", "Guide"])).stdout, /View: backlog doc view doc-\d+/g);
		const firstDocument = await runCli(["doc", "search", "Guide", "--max-count", "1"]);
		expect(idsIn(firstDocument.stdout, /View: backlog doc view doc-\d+/g)).toEqual(documentViews.slice(0, 1));
		expect(firstDocument.stdout).toContain(
			`Showing 1-1 of ${documentViews.length} items. Next: rerun the original command with --skip 1 before any -- separator;`,
		);
		expect((await runCli(["doc", "search", "Guide", "--count"])).stdout).toBe(`${documentViews.length}\n`);
	});

	it("keeps document windows in a stable order when titles are equal", async () => {
		const complete = idsIn((await runCli(["doc", "list", "--plain"])).stdout, /doc-\d+/g);
		const windows = await followWindows(["doc", "list", "--max-count", "1"]);

		expect(complete).toEqual(["doc-2", "doc-1", "doc-3"]);
		expect(windows.flatMap((output) => idsIn(output, /^doc-\d+/gm))).toEqual(complete);
	});

	it("pages draft and milestone lists", async () => {
		const drafts = await runCli(["draft", "list", "--max-count", "2", "--skip", "1"]);
		expect(idsIn(drafts.stdout, /DRAFT-\d+/g)).toEqual(["DRAFT-2", "DRAFT-3"]);
		expect(drafts.stdout).toContain("Showing 2-3 of 3 items.");
		expect(drafts.stdout).not.toContain("Next:");
		expect((await runCli(["draft", "list", "--count"])).stdout).toBe("3\n");

		const completedWindow = await runCli(["milestone", "list", "--show-completed", "--max-count", "1", "--skip", "2"]);
		expect(idsIn(completedWindow.stdout, /m-\d+:/g)).toEqual(["m-2:"]);
		expect(completedWindow.stdout).toContain("Showing 3-3 of 3 items.");
		// Windows print each section once, where it falls, so they join into the complete output.
		for (const args of [
			["milestone", "list", "--show-completed"],
			["milestone", "list"],
		]) {
			const milestones = await runCli(args);
			const milestoneWindows = await followWindows([...args, "--max-count", "1"]);
			expect(joinGroupedWindows(milestoneWindows)).toEqual(printedLines(milestones.stdout));
		}
		expect((await runCli(["milestone", "list", "--count"])).stdout).toBe("2\n");
		expect((await runCli(["milestone", "list", "--show-completed", "--count"])).stdout).toBe("3\n");
	});

	it("documents the options in help and agent instructions", async () => {
		const help = (await runCli(["task", "list", "--help"])).stdout;
		expect(help).toContain("--max-count <n>");
		expect(help).toContain("--skip <n>");
		expect(help).toContain("--count");
		expect(help).toContain("max-count: Positive integer");
		expect(help).toContain("rerun the original command");

		const overview = (await runCli(["instructions", "overview"])).stdout;
		for (const option of ["--max-count", "--skip", "--count"]) {
			expect(overview).toContain(option);
		}
		expect(overview).toContain("replace any existing --skip option");
		expect(overview).toContain("before any `--` separator");
	});
});
