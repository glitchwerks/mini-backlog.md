import { describe, expect, it } from "bun:test";
import {
	buildMilestoneMatchKeys,
	collectMilestoneIds,
	keySetsIntersect,
	resolveMilestoneStorageValue,
} from "../core/milestones.ts";
import type { Milestone, Task } from "../types/index.ts";

const milestones: Milestone[] = [
	{ id: "m-1", title: "Launch", description: "", rawContent: "" },
	{ id: "m-2", title: "m-1", description: "", rawContent: "" },
];

describe("core milestone alias resolution", () => {
	it("resolves numeric and canonical IDs before a colliding title", () => {
		expect(resolveMilestoneStorageValue("1", milestones)).toBe("m-1");
		expect(resolveMilestoneStorageValue("m-1", milestones)).toBe("m-1");
	});

	it("resolves a unique title to its storage ID", () => {
		expect(resolveMilestoneStorageValue("Launch", milestones)).toBe("m-1");
	});

	it("builds intersecting keys for numeric aliases", () => {
		expect(keySetsIntersect(buildMilestoneMatchKeys("1", milestones), new Set(["m-1"]))).toBe(true);
	});

	it("canonicalizes numeric aliases for zero-padded raw IDs in core milestone collections", () => {
		const zeroPaddedMilestones: Milestone[] = [{ id: "001", title: "Legacy", description: "", rawContent: "" }];
		const tasks: Task[] = [
			{
				id: "task-1",
				title: "Numeric alias",
				status: "To Do",
				assignee: [],
				createdDate: "",
				labels: [],
				milestone: "1",
				dependencies: [],
				rawContent: "",
			},
			{
				id: "task-2",
				title: "Canonical alias",
				status: "To Do",
				assignee: [],
				createdDate: "",
				labels: [],
				milestone: "m-1",
				dependencies: [],
				rawContent: "",
			},
		];

		expect(collectMilestoneIds(tasks, zeroPaddedMilestones)).toEqual(["001"]);
	});
});
