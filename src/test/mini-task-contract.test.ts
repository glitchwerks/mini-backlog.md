import { describe, expect, it, mock } from "bun:test";
import { join } from "node:path";
import { $ } from "bun";
import type { TaskDetail, TaskListItem } from "../core/task-detail.ts";
import { searchJson, taskListJson, taskViewJson } from "../formatters/json-output.ts";
import { formatTaskPlainText } from "../formatters/task-plain-text.ts";
import { Core } from "../index.ts";
import { serializeTask } from "../markdown/serializer.ts";
import { McpServer } from "../mcp/server.ts";
import { registerTaskTools } from "../mcp/tools/tasks/index.ts";
import {
	generateMiniTaskCreateSchema,
	generateMiniTaskEditSchema,
	generateMiniTaskListSchema,
	generateMiniTaskSearchSchema,
	generateTaskCreateSchema,
} from "../mcp/utils/schema-generators.ts";
import { createSimpleValidatedTool } from "../mcp/validation/tool-wrapper.ts";
import type { JsonSchema } from "../mcp/validation/validators.ts";
import {
	MINI_MCP_TOOL_NAMES,
	MINI_TASK_CREATE_PROPERTIES,
	MINI_TASK_DETAIL_FIELDS,
	MINI_TASK_EDIT_PROPERTIES,
	MINI_TASK_LIST_PROPERTIES,
	MINI_TASK_SEARCH_PROPERTIES,
	MINI_TASK_SUMMARY_FIELDS,
} from "../mini/surface-policy.ts";
import {
	formatMiniTaskPlainText,
	formatMiniTaskSummaryLine,
	toMiniTaskDetailsJson,
	toMiniTaskSummaryJson,
} from "../mini/task-output.ts";
import type { BacklogConfig } from "../types/index.ts";
import { createUniqueTestDir, initializeFilesystemTestProject, safeCleanup } from "./test-utils.ts";

const config: BacklogConfig = {
	projectName: "Mini contract",
	statuses: ["To Do", "In Progress", "Done"],
	labels: [],
	types: ["feature", "bug"],
	priorities: ["High", "Low"],
	projects: ["Secret"],
	dateFormat: "yyyy-mm-dd",
};

const MINI_CLI_PATH = join(process.cwd(), "src", "cli.ts");

function taskDetailFixture(): TaskDetail {
	return {
		id: "TASK-1",
		title: "Visible task",
		status: "In Progress",
		type: "feature",
		priority: "High",
		assignee: ["@alex"],
		labels: ["mini"],
		milestone: "M1",
		createdDate: "2026-09-14 10:30",
		updatedDate: "2026-09-14 11:45",
		dependencies: ["TASK-2"],
		references: ["https://example.invalid/secret"],
		documentation: ["doc-9"],
		modifiedFiles: ["src/secret.ts"],
		description: "Visible description",
		acceptanceCriteriaItems: [{ index: 1, text: "Visible criterion", checked: true }],
		definitionOfDoneItems: [{ index: 1, text: "hidden DoD", checked: false }],
		comments: [{ index: 1, body: "Visible comment", createdDate: "2026-09-14 12:00", author: "@alex" }],
		implementationPlan: "hidden plan",
		implementationNotes: "hidden notes",
		finalSummary: "hidden summary",
		project: "Secret",
		dueDate: "2026-09-14",
		ordinal: 1000,
		parentTaskId: "TASK-9",
		filePath: "backlog/tasks/task-1.md",
		dependencyGraph: {
			rootId: "TASK-1",
			nodes: [],
			edges: [],
		},
		readiness: {
			isReady: false,
			isBlocked: true,
			blockingDependencies: ["TASK-2"],
			missingDependencies: [],
		},
	};
}

describe("mini task schemas", () => {
	it("projects generated task schemas to the exact approved property sets", () => {
		expect(Object.keys(generateMiniTaskCreateSchema(config).properties ?? {}).sort()).toEqual(
			[...MINI_TASK_CREATE_PROPERTIES].sort(),
		);
		expect(Object.keys(generateMiniTaskListSchema(config).properties ?? {}).sort()).toEqual(
			[...MINI_TASK_LIST_PROPERTIES].sort(),
		);
		expect(Object.keys(generateMiniTaskSearchSchema(config).properties ?? {}).sort()).toEqual(
			[...MINI_TASK_SEARCH_PROPERTIES].sort(),
		);
		expect(Object.keys(generateMiniTaskEditSchema(config).properties ?? {}).sort()).toEqual(
			[...MINI_TASK_EDIT_PROPERTIES].sort(),
		);
		expect(generateMiniTaskCreateSchema(config).required).toEqual(["title"]);
		expect(generateMiniTaskEditSchema(config).required).toEqual(["id"]);
		expect(generateMiniTaskEditSchema(config).additionalProperties).toBe(false);
	});

	it("preserves dynamic validation without mutating the upstream schema", () => {
		const full = generateTaskCreateSchema(config);
		const mini = generateMiniTaskCreateSchema(config);
		expect(mini.properties?.status?.enum).toEqual(["Draft", "To Do", "In Progress", "Done"]);
		expect(mini.properties?.priority?.enum).toEqual(["High", "Low"]);
		expect(mini.properties?.type?.enum).toEqual(["feature", "bug"]);
		expect(full.properties?.project).toBeDefined();
		expect(full.properties?.dueDate).toBeDefined();
	});

	it.each([
		["create", generateMiniTaskCreateSchema(config), { title: "Task", dueDate: "2026-09-14" }],
		["create", generateMiniTaskCreateSchema(config), { title: "Task", project: "Secret" }],
		["create", generateMiniTaskCreateSchema(config), { title: "Task", futureUpstreamField: "hidden" }],
		["edit", generateMiniTaskEditSchema(config), { id: "TASK-1", modifiedFiles: ["secret.ts"] }],
		["edit", generateMiniTaskEditSchema(config), { id: "TASK-1", planSet: "hidden" }],
		["edit", generateMiniTaskEditSchema(config), { id: "TASK-1", definitionOfDoneAdd: ["hidden"] }],
		["edit", generateMiniTaskEditSchema(config), { id: "TASK-1", futureUpstreamField: "hidden" }],
		["list", generateMiniTaskListSchema(config), { project: ["Secret"] }],
		["list", generateMiniTaskListSchema(config), { futureUpstreamField: "hidden" }],
		["search", generateMiniTaskSearchSchema(config), { query: "Task", modifiedFiles: ["secret.ts"] }],
		["search", generateMiniTaskSearchSchema(config), { query: "Task", futureUpstreamField: "hidden" }],
	] as const)("rejects excluded %s input before calling its handler", async (_name, schema, input) => {
		const handler = mock(async () => ({ content: [{ type: "text" as const, text: "called" }] }));
		const tool = createSimpleValidatedTool(
			{ name: "test_task_contract", description: "test", inputSchema: schema },
			schema,
			handler,
		);

		const result = await tool.handler(input);

		expect(result.isError).toBe(true);
		expect(handler).toHaveBeenCalledTimes(0);
	});
});

describe("mini task outputs", () => {
	it("constructs exact summary and detail JSON projections", () => {
		const leakedTask = {
			...taskDetailFixture(),
			futureUpstreamField: "must stay hidden",
		} as TaskDetail & { futureUpstreamField: string };

		const summary = toMiniTaskSummaryJson({ ...leakedTask, isReady: false } as TaskListItem);
		const details = toMiniTaskDetailsJson(leakedTask);

		expect(Object.keys(summary).sort()).toEqual([...MINI_TASK_SUMMARY_FIELDS].sort());
		expect(Object.keys(details).sort()).toEqual([...MINI_TASK_DETAIL_FIELDS].sort());
		expect(details.dependencies).toEqual(["TASK-2"]);
		expect(details.acceptanceCriteria).toEqual([{ index: 1, text: "Visible criterion", checked: true }]);
		expect(details.comments).toEqual([
			{ index: 1, body: "Visible comment", createdAt: "2026-09-14T12:00:00Z", author: "@alex" },
		]);
	});

	it("renders mini task text only from approved concepts", () => {
		const leakedTask = {
			...taskDetailFixture(),
			futureUpstreamField: "must stay hidden",
		} as TaskDetail & { futureUpstreamField: string };

		const plain = formatMiniTaskPlainText(leakedTask);
		const summary = formatMiniTaskSummaryLine(leakedTask, { includeStatus: true });

		expect(plain).toContain("Task TASK-1 - Visible task");
		expect(plain).toContain("Dependencies:\n- TASK-2");
		expect(plain).toContain("Visible description");
		expect(plain).toContain("Visible criterion");
		expect(plain).toContain("Visible comment");
		expect(`${plain}\n${summary}`).not.toMatch(
			/Secret|hidden plan|hidden notes|hidden DoD|hidden summary|futureUpstreamField|Due:|File:|Ordinal:|Parent:|References:|Documentation:|Modified files:|Definition of Done:|Dependency Graph:/,
		);
	});

	it("routes existing task formatter entry points through mini projections", () => {
		const leakedTask = {
			...taskDetailFixture(),
			futureUpstreamField: "must stay hidden",
		} as TaskDetail & { futureUpstreamField: string };
		const listItem = { ...leakedTask, isReady: false } as TaskListItem;

		expect(Object.keys(taskListJson([listItem], "mini").tasks[0] ?? {}).sort()).toEqual(
			[...MINI_TASK_SUMMARY_FIELDS].sort(),
		);
		expect(Object.keys(taskViewJson(leakedTask, "C:/project", "mini").task).sort()).toEqual(
			[...MINI_TASK_DETAIL_FIELDS].sort(),
		);
		expect(formatTaskPlainText(leakedTask, {}, "mini")).toBe(formatMiniTaskPlainText(leakedTask));

		const search = searchJson(
			[
				{ type: "task", score: 1, task: listItem },
				{
					type: "document",
					score: 0.5,
					document: {
						id: "doc-1",
						title: "Visible document",
						type: "guide",
						createdDate: "2026-09-14",
						rawContent: "visible",
					},
				},
				{
					type: "decision",
					score: 0.25,
					decision: {
						id: "decision-1",
						title: "Hidden decision",
						date: "2026-09-14",
						status: "accepted",
						context: "hidden",
						decision: "hidden",
						consequences: "hidden",
						rawContent: "hidden",
					},
				},
			],
			"C:/project",
			"C:/project/backlog/docs",
			"mini",
		);
		expect(search.results.map((result) => result.type)).toEqual(["task", "document"]);
		expect(Object.keys(search.results[0]?.data ?? {}).sort()).toEqual([...MINI_TASK_SUMMARY_FIELDS].sort());
		expect(JSON.stringify(search)).not.toContain("Hidden decision");
	});
});

describe("mini MCP task routing", () => {
	it("registers only approved task tools and emits projected task details", async () => {
		const testDir = createUniqueTestDir("mini-mcp-task-contract");
		const server = new McpServer(testDir, "Mini task contract");
		try {
			await server.filesystem.ensureBacklogStructure();
			await initializeFilesystemTestProject(server, "Mini task contract");
			const serverConfig = await server.filesystem.loadConfig();
			if (!serverConfig) throw new Error("Expected test config");
			registerTaskTools(server, serverConfig, "mini");

			const tools = await server.testInterface.listTools();
			expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
				MINI_MCP_TOOL_NAMES.filter((name) => name.startsWith("task_")).sort(),
			);
			const createSchema = tools.tools.find((tool) => tool.name === "task_create")?.inputSchema as
				| JsonSchema
				| undefined;
			const editSchema = tools.tools.find((tool) => tool.name === "task_edit")?.inputSchema as JsonSchema | undefined;
			expect(Object.keys(createSchema?.properties ?? {}).sort()).toEqual([...MINI_TASK_CREATE_PROPERTIES].sort());
			expect(Object.keys(editSchema?.properties ?? {}).sort()).toEqual([...MINI_TASK_EDIT_PROPERTIES].sort());

			await Bun.write(
				join(testDir, "backlog", "tasks", "task-1 - visible-task.md"),
				serializeTask(taskDetailFixture()),
			);
			server.disposeContentStore();
			const result = await server.testInterface.callTool({
				params: { name: "task_view", arguments: { id: "TASK-1" } },
			});
			const text = (result.content ?? []).map((item) => ("text" in item ? item.text : "")).join("\n");
			expect(result.isError).not.toBe(true);
			expect(text).toContain("Visible description");
			expect(text).not.toMatch(/Secret|hidden plan|hidden notes|hidden DoD|Due:|File:|Ordinal:|Parent:/);
		} finally {
			await server.stop();
			await safeCleanup(testDir);
		}
	});

	it("reports duplicate IDs without leaking task file paths", async () => {
		const testDir = createUniqueTestDir("mini-mcp-task-duplicate-output");
		const server = new McpServer(testDir, "Mini task duplicate output");
		try {
			await server.filesystem.ensureBacklogStructure();
			await initializeFilesystemTestProject(server, "Mini task duplicate output");
			const first = taskDetailFixture();
			await Bun.write(join(testDir, "backlog", "tasks", "task-1 - secret-alpha.md"), serializeTask(first));
			await Bun.write(
				join(testDir, "backlog", "tasks", "task-01 - secret-beta.md"),
				serializeTask({ ...first, id: "TASK-01", title: "Second duplicate" }),
			);
			const serverConfig = await server.filesystem.loadConfig();
			if (!serverConfig) throw new Error("Expected test config");
			registerTaskTools(server, serverConfig, "mini");

			const listResult = await server.testInterface.callTool({ params: { name: "task_list", arguments: {} } });
			const listText = (listResult.content ?? []).map((item) => ("text" in item ? item.text : "")).join("\n");
			expect(listText).toContain("Duplicate task IDs detected: TASK-1");
			expect(listText).not.toMatch(/secret-alpha|secret-beta|backlog[\\/]tasks|backlog doctor/);

			for (const request of [
				{ name: "task_view", arguments: { id: "TASK-1" } },
				{ name: "task_edit", arguments: { id: "TASK-1", description: "Changed" } },
				{ name: "task_complete", arguments: { id: "TASK-1" } },
			]) {
				const result = await server.testInterface.callTool({ params: request });
				const text = (result.content ?? []).map((item) => ("text" in item ? item.text : "")).join("\n");
				expect(result.isError).toBe(true);
				expect(text).toContain("Task ID TASK-1 is ambiguous");
				expect(text).not.toMatch(/secret-alpha|secret-beta|backlog[\\/]tasks|backlog doctor/);
				expect(result.structuredContent).toEqual({ code: "AMBIGUOUS_TASK_ID" });
			}
		} finally {
			await server.stop();
			await safeCleanup(testDir);
		}
	});

	it("preserves unknown persisted frontmatter during an allowed edit", async () => {
		const testDir = createUniqueTestDir("mini-mcp-task-edit-preservation");
		const server = new McpServer(testDir, "Mini task edit preservation");
		try {
			await server.filesystem.ensureBacklogStructure();
			await initializeFilesystemTestProject(server, "Mini task edit preservation");
			const taskPath = join(testDir, "backlog", "tasks", "task-1 - future-field.md");
			await Bun.write(
				taskPath,
				`---
id: task-1
title: Future field
status: To Do
assignee: []
created_date: '2026-09-14'
labels: []
dependencies: []
future_upstream_field: future-value
---

## Description

Original
`,
			);
			const serverConfig = await server.filesystem.loadConfig();
			if (!serverConfig) throw new Error("Expected test config");
			registerTaskTools(server, serverConfig, "mini");

			const result = await server.testInterface.callTool({
				params: { name: "task_edit", arguments: { id: "TASK-1", description: "Changed" } },
			});

			expect(result.isError).not.toBe(true);
			expect(await Bun.file(taskPath).text()).toContain("future-value");
			const text = (result.content ?? []).map((item) => ("text" in item ? item.text : "")).join("\n");
			expect(text).toContain("Changed");
			expect(text).not.toContain("future-value");
		} finally {
			await server.stop();
			await safeCleanup(testDir);
		}
	});

	it("does not overwrite an edit that lands after the locked persistence operation", async () => {
		const testDir = createUniqueTestDir("mini-mcp-task-edit-concurrency");
		const server = new McpServer(testDir, "Mini task edit concurrency");
		try {
			await server.filesystem.ensureBacklogStructure();
			await initializeFilesystemTestProject(server, "Mini task edit concurrency");
			const taskPath = join(testDir, "backlog", "tasks", "task-1 - future-field.md");
			await Bun.write(
				taskPath,
				`---
id: task-1
title: Future field
status: To Do
assignee: []
created_date: '2026-09-14'
labels: []
dependencies: []
future_upstream_field: future-value
---

## Description

Original
`,
			);
			const serverConfig = await server.filesystem.loadConfig();
			if (!serverConfig) throw new Error("Expected test config");
			registerTaskTools(server, serverConfig, "mini");

			const originalEditTaskOrDraft = server.editTaskOrDraft.bind(server);
			server.editTaskOrDraft = async (...args: Parameters<McpServer["editTaskOrDraft"]>) => {
				const result = await originalEditTaskOrDraft(...args);
				const saved = await Bun.file(taskPath).text();
				await Bun.write(
					taskPath,
					saved.replace("future_upstream_field: future-value", "future_upstream_field: concurrent-value"),
				);
				return result;
			};

			const result = await server.testInterface.callTool({
				params: { name: "task_edit", arguments: { id: "TASK-1", description: "Changed" } },
			});

			expect(result.isError).not.toBe(true);
			const persisted = await Bun.file(taskPath).text();
			expect(persisted).toContain("future_upstream_field: concurrent-value");
			expect(persisted).toContain("Changed");
		} finally {
			await server.stop();
			await safeCleanup(testDir);
		}
	});

	it("commits preserved unknown frontmatter with an auto-committed mini edit", async () => {
		const testDir = createUniqueTestDir("mini-mcp-task-edit-autocommit");
		const server = new McpServer(testDir, "Mini task edit auto-commit");
		try {
			await server.filesystem.ensureBacklogStructure();
			await $`git init`.cwd(testDir).quiet();
			await initializeFilesystemTestProject(server, "Mini task edit auto-commit");
			const config = await server.filesystem.loadConfig();
			if (!config) throw new Error("Expected test config");
			config.autoCommit = true;
			config.filesystemOnly = false;
			await server.filesystem.saveConfig(config);
			const relativeTaskPath = "backlog/tasks/task-1 - future-field.md";
			const taskPath = join(testDir, relativeTaskPath);
			await Bun.write(
				taskPath,
				`---
id: task-1
title: Future field
status: To Do
assignee: []
created_date: '2026-09-14'
labels: []
dependencies: []
future_upstream_field: future-value
---

## Description

Original
`,
			);
			await $`git add .`.cwd(testDir).quiet();
			await $`git commit -m baseline`.cwd(testDir).quiet();
			registerTaskTools(server, config, "mini");

			const result = await server.testInterface.callTool({
				params: { name: "task_edit", arguments: { id: "TASK-1", description: "Changed" } },
			});

			expect(result.isError).not.toBe(true);
			const workingContent = await Bun.file(taskPath).text();
			const committedContent = (await $`git show ${`HEAD:${relativeTaskPath}`}`.cwd(testDir).quiet()).stdout.toString();
			for (const content of [workingContent, committedContent]) {
				expect(content).toContain("future_upstream_field: future-value");
				expect(content).toContain("Changed");
			}
		} finally {
			await server.stop();
			await safeCleanup(testDir);
		}
	});
});

describe("mini CLI task routing", () => {
	it("preserves hidden persisted metadata while allowed edits emit only approved fields", async () => {
		const testDir = createUniqueTestDir("mini-cli-task-contract");
		try {
			const core = new Core(testDir);
			await initializeFilesystemTestProject(core, "Mini CLI task contract");
			const taskPath = join(testDir, "backlog", "tasks", "task-1 - hidden-metadata.md");
			await Bun.write(
				taskPath,
				`---
id: task-1
title: Hidden metadata
status: To Do
assignee:
  - "@alex"
created_date: '2026-09-13 10:30'
updated_date: '2026-09-13 11:45'
due_date: '2026-09-14'
labels:
  - mini
milestone: M1
dependencies:
  - TASK-2
references:
  - secret-reference
documentation:
  - secret-documentation
modified_files:
  - secret-file.ts
project: Secret
ordinal: 1000
parent_task_id: TASK-9
future_upstream_field: future-value
---

## Description

Original description

## Acceptance Criteria

- [ ] Visible criterion

## Definition of Done

- [ ] hidden DoD

## Implementation Plan

hidden plan

## Implementation Notes

hidden notes

## Final Summary

hidden summary
`,
			);

			const before = await Bun.file(taskPath).text();
			const result = await $`bun ${MINI_CLI_PATH} task edit TASK-1 --description Changed --plain`
				.cwd(testDir)
				.quiet()
				.nothrow();
			const after = await Bun.file(taskPath).text();

			expect(result.exitCode).toBe(0);
			expect(before).toContain("Original description");
			for (const hiddenValue of [
				"Secret",
				"2026-09-14",
				"secret-reference",
				"secret-documentation",
				"secret-file.ts",
				"hidden plan",
				"hidden notes",
				"hidden DoD",
				"hidden summary",
				"future-value",
			]) {
				expect(after).toContain(hiddenValue);
			}
			expect(after).toContain("Changed");
			expect(result.stdout.toString()).toContain("Changed");
			expect(result.stdout.toString()).not.toMatch(
				/Secret|2026-09-14|secret-reference|secret-documentation|secret-file\.ts|hidden plan|hidden notes|hidden DoD|hidden summary|future-value|Due:|File:|Ordinal:|Parent:/,
			);
		} finally {
			await safeCleanup(testDir);
		}
	});

	it("reports duplicate IDs without leaking task file paths", async () => {
		const testDir = createUniqueTestDir("mini-cli-task-duplicate-output");
		try {
			const core = new Core(testDir);
			await initializeFilesystemTestProject(core, "Mini CLI task duplicate output");
			const first = taskDetailFixture();
			await Bun.write(join(testDir, "backlog", "tasks", "task-1 - secret-alpha.md"), serializeTask(first));
			await Bun.write(
				join(testDir, "backlog", "tasks", "task-01 - secret-beta.md"),
				serializeTask({ ...first, id: "TASK-01", title: "Second duplicate" }),
			);

			const listResult = await $`bun ${MINI_CLI_PATH} task list --plain`.cwd(testDir).quiet().nothrow();
			const listStderr = listResult.stderr.toString();
			expect(listResult.exitCode).toBe(1);
			expect(listStderr).toContain("Duplicate task IDs detected: TASK-1");
			expect(listStderr).not.toMatch(/secret-alpha|secret-beta|backlog[\\/]tasks|backlog doctor/);

			const editResult = await $`bun ${MINI_CLI_PATH} task edit TASK-1 --description Changed --plain`
				.cwd(testDir)
				.quiet()
				.nothrow();
			const editStderr = editResult.stderr.toString();
			expect(editResult.exitCode).toBe(1);
			expect(editStderr).toContain("Task ID TASK-1 is ambiguous");
			expect(editStderr).not.toMatch(/secret-alpha|secret-beta|backlog[\\/]tasks|backlog doctor/);
		} finally {
			await safeCleanup(testDir);
		}
	});

	it("completes a task without exposing its completed file path", async () => {
		const testDir = createUniqueTestDir("mini-cli-task-complete-output");
		try {
			const core = new Core(testDir);
			await initializeFilesystemTestProject(core, "Mini CLI task complete output");
			await Bun.write(
				join(testDir, "backlog", "tasks", "task-1 - secret-complete-path.md"),
				serializeTask({ ...taskDetailFixture(), status: "Done" }),
			);

			const result = await $`bun ${MINI_CLI_PATH} task complete TASK-1`.cwd(testDir).quiet().nothrow();

			expect(result.exitCode).toBe(0);
			expect(result.stdout.toString()).toContain("Completed task TASK-1.");
			expect(result.stdout.toString()).not.toMatch(/File:|secret-complete-path|backlog[\\/]completed/);
		} finally {
			await safeCleanup(testDir);
		}
	});
});
