import { describe, expect, it } from "bun:test";
import { buildMilestoneMatchKeys, keySetsIntersect, resolveMilestoneStorageValue } from "../core/milestones.ts";
import type { Milestone } from "../types/index.ts";

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
});
