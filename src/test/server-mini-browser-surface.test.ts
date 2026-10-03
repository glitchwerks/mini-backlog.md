import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { $ } from "bun";
import { Core } from "../core/backlog.ts";
import { BacklogServer } from "../server/index.ts";
import { createUniqueTestDir, retry, safeCleanup } from "./test-utils.ts";

let testDir: string;
let server: BacklogServer | null = null;
let baseUrl: string;

beforeEach(async () => {
	testDir = createUniqueTestDir("server-mini-browser-surface");
	await mkdir(testDir, { recursive: true });
	await $`git init -b main`.cwd(testDir).quiet();
	const core = new Core(testDir);
	await core.filesystem.ensureBacklogStructure();
	await core.filesystem.saveConfig({
		projectName: "Full browser surface",
		statuses: ["To Do", "In Progress", "Done"],
		labels: [],
		milestones: [],
		dateFormat: "YYYY-MM-DD",
		remoteOperations: false,
		checkActiveBranches: false,
		autoCommit: false,
	});
	server = new BacklogServer(testDir);
	await server.start(0, false);
	baseUrl = `http://127.0.0.1:${server.getPort()}`;
	await retry(async () => {
		const response = await fetch(`${baseUrl}/api/status`);
		if (!response.ok) throw new Error("Server is not ready");
	});
});

afterEach(async () => {
	await server?.stop();
	server = null;
	await safeCleanup(testDir);
});

describe("full browser HTTP surface", () => {
	it("creates and archives a due-dated milestone through the full browser API", async () => {
		const createdResponse = await fetch(`${baseUrl}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Browser Release", dueDate: "2026-10-01" }),
		});
		expect(createdResponse.status).toBe(201);
		const created = (await createdResponse.json()) as { id: string; dueDate?: string };
		expect(created.dueDate).toBe("2026-10-01");

		const archivedResponse = await fetch(`${baseUrl}/api/milestones/${encodeURIComponent(created.id)}/archive`, {
			method: "POST",
		});
		expect(archivedResponse.status).toBe(200);

		const archived = (await (await fetch(`${baseUrl}/api/milestones/archived`)).json()) as Array<{ id: string }>;
		expect(archived.map((milestone) => milestone.id)).toContain(created.id);
	});

	it("classifies malformed milestone JSON as a validation error", async () => {
		const response = await fetch(`${baseUrl}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{",
		});
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
	});

	it("classifies a missing milestone as not found", async () => {
		const response = await fetch(`${baseUrl}/api/milestones/m-999/archive`, { method: "POST" });
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({ code: "NOT_FOUND" });
	});

	it("renames and removes milestones with full browser result envelopes", async () => {
		const createdResponse = await fetch(`${baseUrl}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Browser Rename", dueDate: "2026-10-01" }),
		});
		expect(createdResponse.status).toBe(201);
		const created = (await createdResponse.json()) as { id: string };
		const url = `${baseUrl}/api/milestones/${encodeURIComponent(created.id)}`;
		const renamedResponse = await fetch(url, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Browser Renamed", dueDate: "2026-10-02" }),
		});
		expect(renamedResponse.status).toBe(200);
		const renamed = await renamedResponse.json();
		expect(renamed).toMatchObject({
			success: true,
			milestone: { id: created.id, title: "Browser Renamed", dueDate: "2026-10-02" },
		});
		expect(renamed.message).toContain("Renamed milestone");
		expect(await (await fetch(url)).json()).toMatchObject({ title: "Browser Renamed", dueDate: "2026-10-02" });

		const removedResponse = await fetch(url, { method: "DELETE" });
		expect(removedResponse.status).toBe(200);
		const removed = await removedResponse.json();
		expect(removed.success).toBe(true);
		expect(removed.message).toContain("Removed milestone");
		expect((await fetch(url)).status).toBe(404);
	});

	it("maps core milestone alias conflicts to validation errors", async () => {
		const createdResponse = await fetch(`${baseUrl}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: "Browser Alias" }),
		});
		expect(createdResponse.status).toBe(201);
		const created = (await createdResponse.json()) as { id: string };
		const conflict = await fetch(`${baseUrl}/api/milestones`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: created.id }),
		});
		expect(conflict.status).toBe(400);
		expect(await conflict.json()).toMatchObject({ code: "VALIDATION_ERROR" });
	});

	for (const method of ["PUT", "DELETE"]) {
		it(`maps malformed ${method} bodies to validation errors`, async () => {
			const response = await fetch(`${baseUrl}/api/milestones/m-999`, {
				method,
				headers: { "Content-Type": "application/json" },
				body: "{",
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});

		it(`maps missing ${method} targets to not found`, async () => {
			const response = await fetch(`${baseUrl}/api/milestones/m-999`, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Missing" }),
			});
			expect(response.status).toBe(404);
			expect(await response.json()).toMatchObject({ code: "NOT_FOUND" });
		});
	}
});
