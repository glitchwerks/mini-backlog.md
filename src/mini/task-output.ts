import type { TaskDetail, TaskListItem } from "../core/task-detail.ts";
import type { Task } from "../types/index.ts";
import { formatAcceptanceCriteriaSummarySuffix } from "../ui/acceptance-criteria-progress.ts";
import { transformCodePathsPlain } from "../ui/code-path.ts";
import { formatStatusWithIcon } from "../ui/status-icon.ts";
import type { DuplicateGroup } from "../utils/duplicate-detection.ts";
import { formatPriorityLabel } from "../utils/priority-config.ts";
import { canonicalTaskId } from "../utils/task-path.ts";
import { formatUtcDateForDisplay, type UtcDateDisplayOptions } from "../utils/utc-date-display.ts";

export type MiniTaskSummaryJson = {
	id: string;
	title: string;
	status: string;
	type: string | null;
	priority: string | null;
	assignees: string[];
	labels: string[];
	milestone: string | null;
	acceptanceCriteriaCompleted: number;
	acceptanceCriteriaCount: number;
	createdAt: string | null;
	updatedAt: string | null;
};

export type MiniChecklistItemJson = {
	index: number;
	text: string;
	checked: boolean;
};

export type MiniTaskCommentJson = {
	index: number;
	body: string;
	createdAt: string | null;
	author: string | null;
};

export type MiniTaskDetailsJson = MiniTaskSummaryJson & {
	description: string | null;
	dependencies: string[];
	acceptanceCriteria: MiniChecklistItemJson[];
	comments: MiniTaskCommentJson[];
};

const plainDateDisplayOptions: UtcDateDisplayOptions = { appendUtcLabel: true };

function nullable(value: string | undefined): string | null {
	return value ?? null;
}

function nullableDescription(value: string | undefined): string | null {
	return value === undefined || value === "" ? null : value;
}

function normalizePublicDate(value: string | undefined): string | null {
	if (!value) return null;
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

	const minutePrecision = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/);
	if (minutePrecision) {
		const [, date, time, seconds = "00"] = minutePrecision;
		return `${date}T${time}:${seconds}Z`;
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function toChecklistJson(items: Task["acceptanceCriteriaItems"]): MiniChecklistItemJson[] {
	return (items ?? [])
		.slice()
		.sort((a, b) => a.index - b.index)
		.map(({ index, text, checked }) => ({ index, text, checked }));
}

function toCommentJson(comments: Task["comments"]): MiniTaskCommentJson[] {
	return (comments ?? [])
		.slice()
		.sort((a, b) => a.index - b.index)
		.map((comment) => ({
			index: comment.index,
			body: comment.body,
			createdAt: normalizePublicDate(comment.createdDate),
			author: nullable(comment.author),
		}));
}

function buildMiniTaskSummaryJson(task: Task): MiniTaskSummaryJson {
	const acceptanceCriteria = task.acceptanceCriteriaItems ?? [];
	return {
		id: task.id,
		title: task.title,
		status: task.status,
		type: nullable(task.type),
		priority: nullable(task.priority),
		assignees: [...(task.assignee ?? [])],
		labels: [...(task.labels ?? [])],
		milestone: nullable(task.milestone),
		acceptanceCriteriaCompleted: acceptanceCriteria.filter((criterion) => criterion.checked).length,
		acceptanceCriteriaCount: acceptanceCriteria.length,
		createdAt: normalizePublicDate(task.createdDate),
		updatedAt: normalizePublicDate(task.updatedDate),
	};
}

export function toMiniTaskSummaryJson(task: TaskListItem): MiniTaskSummaryJson {
	return buildMiniTaskSummaryJson(task);
}

export function toMiniTaskDetailsJson(task: TaskDetail): MiniTaskDetailsJson {
	return {
		...buildMiniTaskSummaryJson(task),
		description: nullableDescription(task.description),
		dependencies: [...(task.dependencies ?? [])],
		acceptanceCriteria: toChecklistJson(task.acceptanceCriteriaItems),
		comments: toCommentJson(task.comments),
	};
}

function formatAssignees(assignees: string[]): string | null {
	if (assignees.length === 0) return null;
	return assignees.map((assignee) => (assignee.startsWith("@") ? assignee : `@${assignee}`)).join(", ");
}

function formatCommentHeader(comment: MiniTaskCommentJson): string {
	const parts = [`#${comment.index}`];
	if (comment.author) parts.push(comment.author);
	if (comment.createdAt) parts.push(formatUtcDateForDisplay(comment.createdAt, plainDateDisplayOptions));
	return parts.join(" - ");
}

export function formatMiniTaskSummaryLine(task: Task, options: { includeStatus?: boolean } = {}): string {
	const priorityIndicator = task.priority ? `[${task.priority.toUpperCase()}] ` : "";
	const typeIndicator = task.type ? `[${task.type}] ` : "";
	const status = task.status || (task.source === "completed" ? "Done" : "");
	const statusText = options.includeStatus && status ? ` (${status})` : "";
	return `  ${priorityIndicator}${typeIndicator}${task.id} - ${task.title}${statusText}${formatAcceptanceCriteriaSummarySuffix(task)}`;
}

export function formatMiniDuplicateTaskIdWarning(groups: DuplicateGroup[]): string {
	return `Duplicate task IDs detected: ${groups.map((group) => group.id).join(", ")}.`;
}

export function formatMiniAmbiguousTaskIdError(taskId: string, taskPrefix?: string): string {
	return `Task ID ${canonicalTaskId(taskId, taskPrefix)} is ambiguous.`;
}

export function formatMiniTaskPlainText(task: TaskDetail): string {
	const details = toMiniTaskDetailsJson(task);
	const lines = [
		`Task ${details.id} - ${details.title}`,
		"=".repeat(50),
		"",
		`Status: ${formatStatusWithIcon(details.status)}`,
	];

	if (details.priority) lines.push(`Priority: ${formatPriorityLabel(details.priority)}`);
	if (details.type) lines.push(`Type: ${details.type}`);
	const assignees = formatAssignees(details.assignees);
	if (assignees) lines.push(`Assignee: ${assignees}`);
	if (details.createdAt) lines.push(`Created: ${formatUtcDateForDisplay(details.createdAt, plainDateDisplayOptions)}`);
	if (details.updatedAt) lines.push(`Updated: ${formatUtcDateForDisplay(details.updatedAt, plainDateDisplayOptions)}`);
	if (details.labels.length > 0) lines.push(`Labels: ${details.labels.join(", ")}`);
	if (details.milestone) lines.push(`Milestone: ${details.milestone}`);
	if (details.dependencies.length > 0) lines.push("Dependencies:", ...details.dependencies.map((id) => `- ${id}`));

	lines.push("", "Description:", "-".repeat(50));
	lines.push(transformCodePathsPlain(details.description?.trim() || "No description provided"));
	lines.push("", "Acceptance Criteria:", "-".repeat(50));
	if (details.acceptanceCriteria.length === 0) {
		lines.push("No acceptance criteria defined");
	} else {
		for (const criterion of details.acceptanceCriteria) {
			lines.push(
				`${criterion.checked ? "- [x]" : "- [ ]"} #${criterion.index} ${transformCodePathsPlain(criterion.text)}`,
			);
		}
	}

	const comments = details.comments.filter((comment) => comment.body.trim().length > 0);
	if (comments.length > 0) {
		lines.push("", "Comments:", "-".repeat(50));
		for (const comment of comments) {
			lines.push(formatCommentHeader(comment), transformCodePathsPlain(comment.body.trim()), "");
		}
	}

	return lines.join("\n");
}
