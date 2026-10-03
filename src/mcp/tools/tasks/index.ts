import type { SurfaceMode } from "../../../mini/runtime.ts";
import { formatMiniAmbiguousTaskIdError } from "../../../mini/task-output.ts";
import type { BacklogConfig } from "../../../types/index.ts";
import { isAmbiguousTaskIdError } from "../../../utils/task-path.ts";
import { BacklogToolError } from "../../errors/mcp-errors.ts";
import type { McpServer } from "../../server.ts";
import type { McpToolHandler } from "../../types.ts";
import {
	generateMiniTaskCreateSchema,
	generateMiniTaskEditSchema,
	generateMiniTaskListSchema,
	generateMiniTaskSearchSchema,
	generateTaskCreateSchema,
	generateTaskEditSchema,
	generateTaskListSchema,
	generateTaskSearchSchema,
} from "../../utils/schema-generators.ts";
import { createSimpleValidatedTool } from "../../validation/tool-wrapper.ts";
import type { TaskCreateArgs, TaskEditRequest, TaskListArgs, TaskSearchArgs } from "./handlers.ts";
import { TaskHandlers } from "./handlers.ts";
import { taskArchiveSchema, taskCompleteSchema, taskViewSchema } from "./schemas.ts";

async function projectMiniTaskError<T>(
	surface: SurfaceMode,
	taskPrefix: string | undefined,
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (surface === "mini" && isAmbiguousTaskIdError(error)) {
			throw new BacklogToolError(formatMiniAmbiguousTaskIdError(error.taskId, taskPrefix), "AMBIGUOUS_TASK_ID");
		}
		throw error;
	}
}

export function registerTaskTools(server: McpServer, config: BacklogConfig, surface: SurfaceMode = "full"): void {
	const handlers = new TaskHandlers(server, surface);

	const taskCreateSchema = surface === "mini" ? generateMiniTaskCreateSchema(config) : generateTaskCreateSchema(config);
	const taskEditSchema = surface === "mini" ? generateMiniTaskEditSchema(config) : generateTaskEditSchema(config);
	const taskListSchema = surface === "mini" ? generateMiniTaskListSchema(config) : generateTaskListSchema(config);
	const taskSearchSchema = surface === "mini" ? generateMiniTaskSearchSchema(config) : generateTaskSearchSchema(config);

	const createTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_create",
			description: "Create a new task using Backlog.md",
			inputSchema: taskCreateSchema,
			annotations: { title: "Create Task", destructiveHint: false },
		},
		taskCreateSchema,
		async (input) => handlers.createTask(input as TaskCreateArgs),
	);

	const listTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_list",
			description:
				surface === "mini"
					? "List tasks with optional status, type, assignee, unassigned, milestone, labels, search, ready, and limit filters"
					: "List Backlog.md tasks with optional filtering by status, type, project, assignee (or unassigned: true for tasks with no assignee), milestone, labels, and search",
			inputSchema: taskListSchema,
			annotations: { title: "List Tasks", readOnlyHint: true, destructiveHint: false },
		},
		taskListSchema,
		async (input) => handlers.listTasks(input as TaskListArgs),
	);

	const searchTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_search",
			description:
				surface === "mini"
					? "Search tasks by query, status, task type, and priority"
					: "Search Backlog.md tasks by title, description, task type, project, and modified file path filters",
			inputSchema: taskSearchSchema,
			annotations: { title: "Search Tasks", readOnlyHint: true, destructiveHint: false },
		},
		taskSearchSchema,
		async (input) => handlers.searchTasks(input as TaskSearchArgs),
	);

	const editTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_edit",
			description:
				surface === "mini"
					? "Edit task title, description, status, priority, type, milestone, labels, assignees, dependencies, comments, and acceptance criteria"
					: "Edit a Backlog.md task, including metadata (status, priority, type, project), implementation plan/notes, dependencies, acceptance criteria, and task-specific Definition of Done items",
			inputSchema: taskEditSchema,
			annotations: { title: "Edit Task", destructiveHint: false },
		},
		taskEditSchema,
		async (input) =>
			projectMiniTaskError(surface, config.prefixes?.task, async () =>
				handlers.editTask(input as unknown as TaskEditRequest),
			),
	);

	const viewTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_view",
			description: "View a Backlog.md task details",
			inputSchema: taskViewSchema,
			annotations: { title: "View Task", readOnlyHint: true, destructiveHint: false },
		},
		taskViewSchema,
		async (input) =>
			projectMiniTaskError(surface, config.prefixes?.task, async () => handlers.viewTask(input as { id: string })),
	);

	const archiveTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_archive",
			description: "Archive a Backlog.md task",
			inputSchema: taskArchiveSchema,
			annotations: { title: "Archive Task", destructiveHint: true },
		},
		taskArchiveSchema,
		async (input) => handlers.archiveTask(input as { id: string }),
	);

	const completeTaskTool: McpToolHandler = createSimpleValidatedTool(
		{
			name: "task_complete",
			description: "Complete a Backlog.md task (move it to the completed folder)",
			inputSchema: taskCompleteSchema,
			annotations: { title: "Complete Task", destructiveHint: true },
		},
		taskCompleteSchema,
		async (input) =>
			projectMiniTaskError(surface, config.prefixes?.task, async () => handlers.completeTask(input as { id: string })),
	);

	server.addTool(createTaskTool);
	server.addTool(listTaskTool);
	server.addTool(searchTaskTool);
	server.addTool(editTaskTool);
	server.addTool(viewTaskTool);
	if (surface === "full") server.addTool(archiveTaskTool);
	server.addTool(completeTaskTool);
}

export type { TaskCreateArgs, TaskEditArgs, TaskListArgs, TaskSearchArgs } from "./handlers.ts";
export {
	taskArchiveSchema,
	taskCompleteSchema,
	taskListSchema,
	taskSearchSchema,
	taskViewSchema,
} from "./schemas.ts";
