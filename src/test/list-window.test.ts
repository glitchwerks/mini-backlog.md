import { describe, expect, it, spyOn } from "bun:test";
import { Command } from "commander";
import {
	addListWindowOptions,
	formatListWindowFooter,
	type ListPage,
	type ListWindow,
	milestoneSectionsInWindow,
	parseListWindow,
	selectListWindow,
} from "../utils/list-window.ts";

/** `backlog task list` with the window options and one option that reads a value, `--search`. */
function taskListCommand(): Command {
	return addListWindowOptions(new Command("backlog").command("task").command("list").option("--search <query>"));
}

function windowOf(skip: number, maxCount?: number): ListWindow {
	const window = parseListWindow(
		{ skip: String(skip), maxCount: maxCount === undefined ? undefined : String(maxCount) },
		taskListCommand(),
	);
	if (!window) throw new Error("invalid test window");
	return window;
}

describe("list windows", () => {
	it("covers every item exactly once when following nextSkip", () => {
		for (const size of [0, 1, 5, 6, 7]) {
			const items = Array.from({ length: size }, (_, index) => index);
			for (const maxCount of [1, 2, 3, 10]) {
				const seen: number[] = [];
				let skip: number | null = 0;
				while (skip !== null) {
					const page: ListPage<number> = selectListWindow(items, windowOf(skip, maxCount));
					seen.push(...page.items);
					skip = page.nextSkip;
				}
				expect(seen).toEqual(items);
			}
		}
	});

	it("marks only windows that leave items out as cut", () => {
		const items = ["a", "b", "c"];

		expect(selectListWindow(items, windowOf(0))).toMatchObject({ items, cut: false, nextSkip: null });
		expect(selectListWindow(items, windowOf(0, 3))).toMatchObject({ items, cut: false, nextSkip: null });
		expect(selectListWindow([], windowOf(4, 2))).toMatchObject({ items: [], total: 0, cut: false, nextSkip: null });
		expect(selectListWindow(items, windowOf(0, 2))).toMatchObject({ items: ["a", "b"], cut: true, nextSkip: 2 });
		expect(selectListWindow(items, windowOf(2, 2))).toMatchObject({ items: ["c"], cut: true, nextSkip: null });
		expect(selectListWindow(items, windowOf(1))).toMatchObject({ items: ["b", "c"], cut: true, nextSkip: null });
		expect(selectListWindow(items, windowOf(3, 2))).toMatchObject({ items: [], total: 3, cut: true, nextSkip: null });
	});

	it("prints a shell-neutral continuation hint only while more items follow", () => {
		const items = ["a", "b", "c", "d", "e"];
		const footer = (skip: number, maxCount: number) => {
			return formatListWindowFooter(selectListWindow(items, windowOf(skip, maxCount)));
		};

		expect(footer(0, 5)).toBeNull();
		expect(footer(2, 2)).toBe(
			"Showing 3-4 of 5 items. Next: rerun the original command with --skip 4 before any -- separator; replace any existing --skip option and keep all other arguments.",
		);
		expect(footer(4, 2)).toBe("Showing 5-5 of 5 items.");
		expect(footer(9, 2)).toBe("Showing 0 of 5 items.");
	});

	it("accepts a positive max-count, a non-negative skip, and count without JSON", () => {
		expect(parseListWindow({}, taskListCommand())).toMatchObject({
			skip: 0,
			maxCount: undefined,
			count: false,
			forcesText: false,
		});
		expect(parseListWindow({ maxCount: "5", skip: "0" }, taskListCommand())).toMatchObject({
			skip: 0,
			maxCount: 5,
			count: false,
			forcesText: true,
		});
		expect(parseListWindow({ count: true }, taskListCommand())).toMatchObject({
			count: true,
			forcesText: true,
		});
	});

	it("prints each milestone section once, where it falls", () => {
		const active = { isCompleted: false };
		const completed = { isCompleted: true };
		const sections = (items: { isCompleted: boolean }[], skip: number, maxCount: number, listsCompleted: boolean) => {
			const activeCount = items.filter((item) => !item.isCompleted).length;
			return milestoneSectionsInWindow(selectListWindow(items, windowOf(skip, maxCount)), activeCount, listsCompleted);
		};

		// Two active and one listed completed milestone, one per window.
		const listed = [active, active, completed];
		expect(sections(listed, 0, 1, true)).toEqual({ active: true, completed: false });
		expect(sections(listed, 1, 1, true)).toEqual({ active: true, completed: false });
		expect(sections(listed, 2, 1, true)).toEqual({ active: false, completed: true });
		// Completed milestones collapsed: their section follows the last active milestone.
		expect(sections([active, active], 0, 1, false)).toEqual({ active: true, completed: false });
		expect(sections([active, active], 1, 1, false)).toEqual({ active: true, completed: true });
		// No active milestones: the empty Active section opens the first window only.
		expect(sections([completed, completed], 0, 1, true)).toEqual({ active: true, completed: true });
		expect(sections([completed, completed], 1, 1, true)).toEqual({ active: false, completed: true });
		// No milestones at all: the single window prints both empty sections, whatever it skips.
		expect(sections([], 3, 1, false)).toEqual({ active: true, completed: true });
	});

	it("rejects invalid window values and count with JSON", () => {
		const errors = spyOn(console, "error").mockImplementation(() => {});
		const previousExitCode = process.exitCode;
		try {
			for (const options of [{ maxCount: "0" }, { maxCount: "2.5" }, { skip: "-1" }, { skip: "x" }]) {
				process.exitCode = 0;
				expect(parseListWindow(options, taskListCommand())).toBeNull();
				expect(process.exitCode).toBe(1);
			}
			expect(parseListWindow({ count: true, json: true }, taskListCommand())).toBeNull();
			expect(errors).toHaveBeenLastCalledWith(
				"--count cannot be combined with --json. Try 'backlog task list --help' for options.",
			);
		} finally {
			errors.mockRestore();
			// Bun leaves the previous failure code in place when assigned undefined.
			process.exitCode = previousExitCode ?? 0;
		}
	});
});
