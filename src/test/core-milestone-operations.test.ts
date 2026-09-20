import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdir } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { MilestoneOperationError, MilestoneOperations } from "../core/milestone-operations.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

describe("core milestone operations", () => {
	let testDir: string;
	let core: Core;
	let operations: MilestoneOperations;

	beforeEach(async () => {
		testDir = createUniqueTestDir("core-milestone-operations");
		await mkdir(testDir, { recursive: true });
		await $`git init -b main`.cwd(testDir).quiet();
		core = new Core(testDir);
		await core.filesystem.ensureBacklogStructure();
		await core.filesystem.saveConfig({
			projectName: "Core milestone operations",
			statuses: ["To Do", "In Progress", "Done"],
			labels: [],
			milestones: [],
			dateFormat: "YYYY-MM-DD",
			remoteOperations: false,
			checkActiveBranches: false,
			autoCommit: false,
		});
		operations = new MilestoneOperations(core);
	});

	afterEach(async () => {
		await safeCleanup(testDir);
	});

	/** Create real task records in deliberately non-sorted order. */
	async function createReferencingTasks(): Promise<void> {
		for (const id of ["TASK-2", "TASK-1"]) {
			await core.createTask(
				{
					id,
					title: id,
					status: "To Do",
					assignee: [],
					createdDate: "2026-09-19",
					labels: [],
					dependencies: [],
					milestone: "Launch",
				},
				false,
			);
		}
	}

	it("adds and archives a due-dated milestone without transport envelopes", async () => {
		const added = await operations.add({ name: "Launch", dueDate: "2026-10-01" });
		expect(added.milestone).toMatchObject({ title: "Launch", dueDate: "2026-10-01" });
		expect(added.updatedTaskIds).toEqual([]);
		expect(added).not.toHaveProperty("content");
		const archived = await operations.archive({ name: added.milestone?.id ?? "" });
		expect(archived.message).toContain("Archived milestone");
		expect(archived.milestone?.id).toBe(added.milestone?.id);
		expect(archived.updatedTaskIds).toEqual([]);
		expect(await core.filesystem.listMilestones()).toEqual([]);
		expect(await core.filesystem.listArchivedMilestones()).toHaveLength(1);
	});

	it("renames a milestone and returns sorted updated task IDs", async () => {
		await core.filesystem.createMilestone("Launch");
		await createReferencingTasks();
		const result = await operations.rename({ from: "Launch", to: "Release" });
		expect(result.updatedTaskIds).toEqual(["TASK-1", "TASK-2"]);
		expect(result.milestone?.title).toBe("Release");
		expect((await core.filesystem.loadTask("TASK-1"))?.milestone).toBe("m-0");
		expect((await core.filesystem.loadTask("TASK-2"))?.milestone).toBe("m-0");
		const unchanged = await operations.rename({ from: "Release", to: "Release" });
		expect(unchanged.milestone?.title).toBe("Release");
		expect(unchanged.updatedTaskIds).toEqual([]);
	});

	it("removes a milestone, clears task references, and returns the archived record", async () => {
		await core.filesystem.createMilestone("Launch");
		await createReferencingTasks();
		const result = await operations.remove({ name: "Launch" });
		expect(result.updatedTaskIds).toEqual(["TASK-1", "TASK-2"]);
		expect(result.milestone?.title).toBe("Launch");
		expect((await core.filesystem.loadTask("TASK-1"))?.milestone).toBeUndefined();
		expect((await core.filesystem.loadTask("TASK-2"))?.milestone).toBeUndefined();
		expect(await core.filesystem.listMilestones()).toEqual([]);
		expect(await core.filesystem.listArchivedMilestones()).toHaveLength(1);
	});

	it("uses stable domain error codes for missing milestones and invalid input", async () => {
		await expect(operations.archive({ name: "missing" })).rejects.toBeInstanceOf(MilestoneOperationError);
		await expect(operations.archive({ name: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(operations.add({ name: " " })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
		await expect(operations.add({ name: "Launch", dueDate: "invalid" })).rejects.toMatchObject({
			code: "VALIDATION_ERROR",
		});
		expect(await core.filesystem.listMilestones()).toEqual([]);
	});

	it("rolls back task and milestone changes when rename task updates fail", async () => {
		await core.filesystem.createMilestone("Launch");
		await createReferencingTasks();
		const originalEdit = core.editTask.bind(core);
		let calls = 0;
		const edit = spyOn(core, "editTask").mockImplementation(async (...args) => {
			if (++calls === 2) throw new Error("task write failed");
			return originalEdit(...args);
		});
		try {
			await expect(operations.rename({ from: "Launch", to: "Release" })).rejects.toMatchObject({
				code: "INTERNAL_ERROR",
			});
		} finally {
			edit.mockRestore();
		}
		expect((await core.filesystem.listMilestones())[0]?.title).toBe("Launch");
		expect((await core.filesystem.loadTask("TASK-1"))?.milestone).toBe("Launch");
		expect((await core.filesystem.loadTask("TASK-2"))?.milestone).toBe("Launch");
	});
});
