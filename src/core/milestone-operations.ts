import { rename as moveFile } from "node:fs/promises";
import type { Milestone, Task } from "../types/index.ts";
import { normalizeDueDate } from "../utils/due-date.ts";
import { formatUtcDateForDisplay } from "../utils/utc-date-display.ts";
import type { Core } from "./backlog.ts";
import {
	buildMilestoneMatchKeys,
	keySetsIntersect,
	milestoneKey,
	normalizeMilestoneName,
	resolveMilestoneStorageValue,
} from "./milestones.ts";

export type MilestoneOperationErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

/** A milestone domain failure, independent of its calling transport. */
export class MilestoneOperationError extends Error {
	constructor(
		message: string,
		readonly code: MilestoneOperationErrorCode,
	) {
		super(message);
		this.name = "MilestoneOperationError";
	}
}

export type MilestoneOperationResult = {
	message: string;
	milestone?: Milestone;
	updatedTaskIds: string[];
};

export type MilestoneOperationPresentation = {
	/** Preserve extension fields during task edits and rollback; defaults to false. */
	preserveUnknownTaskFrontmatter?: boolean;
	/** Include due dates and file-move details in summaries; defaults to true. */
	includeExtendedSummary?: boolean;
};

export type MilestoneAddArgs = {
	name: string;
	description?: string;
	dueDate?: string;
};

export type MilestoneRenameArgs = {
	from: string;
	to: string;
	updateTasks?: boolean;
	dueDate?: string | null;
};

export type MilestoneRemoveArgs = {
	name: string;
	taskHandling?: "clear" | "keep" | "reassign";
	reassignTo?: string;
};

export type MilestoneArchiveArgs = {
	name: string;
};

function formatTaskIdList(taskIds: string[], limit = 20): string {
	if (taskIds.length === 0) return "";
	const shown = taskIds.slice(0, limit);
	const suffix = taskIds.length > limit ? ` (and ${taskIds.length - limit} more)` : "";
	return `${shown.join(", ")}${suffix}`;
}

function findActiveMilestoneByAlias(name: string, milestones: Milestone[]): Milestone | undefined {
	const normalized = normalizeMilestoneName(name);
	const key = milestoneKey(normalized);
	if (!key) {
		return undefined;
	}
	const resolvedId = resolveMilestoneStorageValue(normalized, milestones);
	const resolvedKey = milestoneKey(resolvedId);
	const idMatch = milestones.find((milestone) => milestoneKey(milestone.id) === resolvedKey);
	if (idMatch) {
		return idMatch;
	}
	const titleMatches = milestones.filter((milestone) => milestoneKey(milestone.title) === key);
	return titleMatches.length === 1 ? titleMatches[0] : undefined;
}

function buildTaskMatchKeysForMilestone(name: string, milestone?: Milestone, includeTitleMatch = true): Set<string> {
	if (!milestone) {
		return buildMilestoneMatchKeys(name, []);
	}
	const baseValue = includeTitleMatch ? name : milestone.id;
	const keys = buildMilestoneMatchKeys(baseValue, [milestone]);
	for (const key of buildMilestoneMatchKeys(milestone.id, [milestone])) {
		keys.add(key);
	}
	const titleKey = milestoneKey(milestone.title);
	if (titleKey) {
		if (includeTitleMatch) {
			keys.add(titleKey);
		} else {
			keys.delete(titleKey);
		}
	}
	return keys;
}

function buildMilestoneRecordMatchKeys(milestone: Milestone): Set<string> {
	const keys = buildMilestoneMatchKeys(milestone.id, [milestone]);
	const titleKey = milestoneKey(milestone.title);
	if (titleKey) {
		keys.add(titleKey);
	}
	return keys;
}

function hasMilestoneTitleAliasCollision(sourceMilestone: Milestone, candidates: Milestone[]): boolean {
	const sourceMilestoneIdKey = milestoneKey(sourceMilestone.id);
	const sourceTitleKey = milestoneKey(sourceMilestone.title);
	if (!sourceTitleKey) {
		return false;
	}
	return candidates.some((candidate) => {
		if (milestoneKey(candidate.id) === sourceMilestoneIdKey) {
			return false;
		}
		return buildMilestoneRecordMatchKeys(candidate).has(sourceTitleKey);
	});
}

/** Shared milestone mutations, task coordination, rollback, and auto-commit behavior. */
export class MilestoneOperations {
	constructor(
		private readonly core: Core,
		private readonly presentation: MilestoneOperationPresentation = {},
	) {}

	private async listLocalTasks(): Promise<Task[]> {
		return await this.core.filesystem.listTasks();
	}

	private async rollbackTaskMilestones(previousMilestones: Map<string, string | undefined>): Promise<string[]> {
		const failedTaskIds: string[] = [];
		for (const [taskId, milestone] of previousMilestones.entries()) {
			try {
				await this.core.editTask(taskId, { milestone: milestone ?? null }, false, {
					preserveUnknownFrontmatter: this.presentation.preserveUnknownTaskFrontmatter ?? false,
				});
			} catch {
				failedTaskIds.push(taskId);
			}
		}
		return failedTaskIds.sort((a, b) => a.localeCompare(b));
	}

	private async commitMilestoneMutation(
		commitMessage: string,
		options: {
			sourcePath?: string;
			targetPath?: string;
			taskFilePaths?: Iterable<string>;
		},
	): Promise<void> {
		const shouldAutoCommit = await this.core.shouldAutoCommit();
		if (!shouldAutoCommit) {
			return;
		}

		let repoRoot: string | null = null;
		const commitPaths: string[] = [];
		if (options.sourcePath && options.targetPath) {
			repoRoot = await this.core.git.stageFileMove(options.sourcePath, options.targetPath);
			commitPaths.push(options.sourcePath, options.targetPath);
		}
		for (const filePath of options.taskFilePaths ?? []) {
			await this.core.git.addFile(filePath);
			commitPaths.push(filePath);
		}
		try {
			await this.core.git.commitFiles(commitMessage, commitPaths, repoRoot);
		} catch (error) {
			await this.core.git.resetPaths(commitPaths, repoRoot);
			throw error;
		}
	}

	private async listFileMilestones(): Promise<Milestone[]> {
		return await this.core.filesystem.listMilestones();
	}

	private async listArchivedMilestones(): Promise<Milestone[]> {
		return await this.core.filesystem.listArchivedMilestones();
	}

	/** Create an active milestone after validating its aliases and optional due date. */
	async add(args: MilestoneAddArgs): Promise<MilestoneOperationResult> {
		const name = normalizeMilestoneName(args.name);
		if (!name) {
			throw new MilestoneOperationError("Milestone name cannot be empty.", "VALIDATION_ERROR");
		}
		let dueDate: string | undefined;
		try {
			dueDate = normalizeDueDate(args.dueDate, "Due date");
		} catch (error) {
			throw new MilestoneOperationError(error instanceof Error ? error.message : String(error), "VALIDATION_ERROR");
		}

		// Check for duplicates in existing milestone files
		const existing = await this.listFileMilestones();
		const requestedKeys = buildMilestoneMatchKeys(name, existing);
		const duplicate = existing.find((milestone) => {
			const milestoneKeys = buildMilestoneRecordMatchKeys(milestone);
			return keySetsIntersect(requestedKeys, milestoneKeys);
		});
		if (duplicate) {
			throw new MilestoneOperationError(
				`Milestone alias conflict: "${name}" matches existing milestone "${duplicate.title}" (${duplicate.id}).`,
				"VALIDATION_ERROR",
			);
		}

		// Read the config before writing: a config Backlog refuses to read must abort the command
		// before the milestone file exists, not after.
		await this.core.ensureConfigLoaded();

		// Create milestone file
		const milestone = await this.core.filesystem.createMilestone(name, args.description, dueDate);
		const milestonePath = await this.core.filesystem.getMilestoneFilePath(milestone.id);
		await this.commitMilestoneMutation(`backlog: Add milestone ${milestone.id}`, {
			taskFilePaths: milestonePath ? [milestonePath] : [],
		});

		return {
			message: `Created milestone "${milestone.title}" (${milestone.id}).${(this.presentation.includeExtendedSummary ?? true) && milestone.dueDate ? `\nDue: ${formatUtcDateForDisplay(milestone.dueDate)}` : ""}`,
			milestone,
			updatedTaskIds: [],
		};
	}

	/** Rename a milestone and optionally migrate matching local task references to its ID. */
	async rename(args: MilestoneRenameArgs): Promise<MilestoneOperationResult> {
		const fromName = normalizeMilestoneName(args.from);
		const toName = normalizeMilestoneName(args.to);
		if (!fromName || !toName) {
			throw new MilestoneOperationError("Both 'from' and 'to' milestone names are required.", "VALIDATION_ERROR");
		}

		const fileMilestones = await this.listFileMilestones();
		const archivedMilestones = await this.listArchivedMilestones();
		const sourceMilestone = findActiveMilestoneByAlias(fromName, fileMilestones);
		if (!sourceMilestone) {
			throw new MilestoneOperationError(`Milestone not found: "${fromName}"`, "NOT_FOUND");
		}
		let requestedDueDate: string | undefined;
		try {
			requestedDueDate =
				args.dueDate === undefined
					? sourceMilestone.dueDate
					: args.dueDate === null
						? undefined
						: normalizeDueDate(args.dueDate, "Due date");
		} catch (error) {
			throw new MilestoneOperationError(error instanceof Error ? error.message : String(error), "VALIDATION_ERROR");
		}
		const titleChanged = toName !== sourceMilestone.title.trim();
		const dueDateChanged = requestedDueDate !== sourceMilestone.dueDate;
		if (!titleChanged && !dueDateChanged) {
			return {
				message: `Milestone "${sourceMilestone.title}" (${sourceMilestone.id}) is already named "${sourceMilestone.title}". No changes made.`,
				milestone: sourceMilestone,
				updatedTaskIds: [],
			};
		}
		const hasTitleCollision = hasMilestoneTitleAliasCollision(sourceMilestone, [
			...fileMilestones,
			...archivedMilestones,
		]);

		const targetKeys = buildMilestoneMatchKeys(toName, fileMilestones);
		const aliasConflict = fileMilestones.find(
			(milestone) =>
				milestoneKey(milestone.id) !== milestoneKey(sourceMilestone.id) &&
				keySetsIntersect(targetKeys, buildMilestoneRecordMatchKeys(milestone)),
		);
		if (aliasConflict) {
			throw new MilestoneOperationError(
				`Milestone alias conflict: "${toName}" matches existing milestone "${aliasConflict.title}" (${aliasConflict.id}).`,
				"VALIDATION_ERROR",
			);
		}

		const targetMilestone = sourceMilestone.id;
		const shouldUpdateTasks = titleChanged && (args.updateTasks ?? true);
		const tasks = shouldUpdateTasks ? await this.listLocalTasks() : [];
		const matchKeys = shouldUpdateTasks
			? buildTaskMatchKeysForMilestone(fromName, sourceMilestone, !hasTitleCollision)
			: new Set<string>();
		const matches = shouldUpdateTasks ? tasks.filter((task) => matchKeys.has(milestoneKey(task.milestone ?? ""))) : [];
		let updatedTaskIds: string[] = [];
		const updatedTaskFilePaths = new Set<string>();

		const renameResult = await this.core.renameMilestone(sourceMilestone.id, toName, false, args.dueDate);
		if (!renameResult.success || !renameResult.milestone) {
			throw new MilestoneOperationError(`Failed to rename milestone "${sourceMilestone.title}".`, "INTERNAL_ERROR");
		}

		const renamedMilestone = renameResult.milestone;
		const previousMilestones = new Map<string, string | undefined>();
		if (shouldUpdateTasks) {
			try {
				for (const task of matches) {
					previousMilestones.set(task.id, task.milestone);
					const updatedTask = await this.core.editTask(task.id, { milestone: targetMilestone }, false, {
						preserveUnknownFrontmatter: this.presentation.preserveUnknownTaskFrontmatter ?? false,
					});
					const taskFilePath = updatedTask.filePath ?? task.filePath;
					if (taskFilePath) {
						updatedTaskFilePaths.add(taskFilePath);
					}
					updatedTaskIds.push(task.id);
				}
				updatedTaskIds = updatedTaskIds.sort((a, b) => a.localeCompare(b));
			} catch {
				const rollbackTaskFailures = await this.rollbackTaskMilestones(previousMilestones);
				const rollbackRenameResult = await this.core.renameMilestone(
					sourceMilestone.id,
					sourceMilestone.title,
					false,
					sourceMilestone.dueDate ?? null,
				);
				const rollbackDetails: string[] = [];
				if (!rollbackRenameResult.success) {
					rollbackDetails.push("failed to rollback milestone file rename");
				}
				if (rollbackTaskFailures.length > 0) {
					rollbackDetails.push(`failed to rollback task milestones for: ${rollbackTaskFailures.join(", ")}`);
				}
				const detailSuffix = rollbackDetails.length > 0 ? ` (${rollbackDetails.join("; ")})` : "";
				throw new MilestoneOperationError(
					`Failed to update task milestones after renaming "${sourceMilestone.title}"${detailSuffix}.`,
					"INTERNAL_ERROR",
				);
			}
		}
		try {
			const commitAction = titleChanged ? "Rename" : "Update";
			await this.commitMilestoneMutation(`backlog: ${commitAction} milestone ${sourceMilestone.id}`, {
				sourcePath: renameResult.sourcePath,
				targetPath: renameResult.targetPath,
				taskFilePaths: updatedTaskFilePaths,
			});
		} catch {
			const rollbackTaskFailures = await this.rollbackTaskMilestones(previousMilestones);
			const rollbackRenameResult = await this.core.renameMilestone(
				sourceMilestone.id,
				sourceMilestone.title,
				false,
				sourceMilestone.dueDate ?? null,
			);
			const rollbackDetails: string[] = [];
			if (!rollbackRenameResult.success) {
				rollbackDetails.push("failed to rollback milestone file rename");
			}
			if (rollbackTaskFailures.length > 0) {
				rollbackDetails.push(`failed to rollback task milestones for: ${rollbackTaskFailures.join(", ")}`);
			}
			const detailSuffix = rollbackDetails.length > 0 ? ` (${rollbackDetails.join("; ")})` : "";
			throw new MilestoneOperationError(
				`Failed while finalizing milestone rename "${sourceMilestone.title}"${detailSuffix}.`,
				"INTERNAL_ERROR",
			);
		}

		const summaryLines: string[] = [];
		if (titleChanged) {
			summaryLines.push(
				`Renamed milestone "${sourceMilestone.title}" (${sourceMilestone.id}) → "${renamedMilestone.title}" (${renamedMilestone.id}).`,
			);
		}
		if ((this.presentation.includeExtendedSummary ?? true) && dueDateChanged) {
			summaryLines.push(
				renamedMilestone.dueDate
					? `Due: ${formatUtcDateForDisplay(renamedMilestone.dueDate)}`
					: "Cleared milestone due date.",
			);
		}
		if (shouldUpdateTasks) {
			summaryLines.push(
				`Updated ${updatedTaskIds.length} local task${updatedTaskIds.length === 1 ? "" : "s"}: ${formatTaskIdList(updatedTaskIds)}`,
			);
		} else if (titleChanged) {
			summaryLines.push("Skipped updating tasks (updateTasks=false).");
		}
		if (
			(this.presentation.includeExtendedSummary ?? true) &&
			renameResult.sourcePath &&
			renameResult.targetPath &&
			renameResult.sourcePath !== renameResult.targetPath
		) {
			summaryLines.push(`Renamed milestone file: ${renameResult.sourcePath} -> ${renameResult.targetPath}`);
		}

		return {
			message: summaryLines.join("\n"),
			milestone: renamedMilestone,
			updatedTaskIds,
		};
	}

	/** Archive an active milestone while clearing, keeping, or reassigning task references. */
	async remove(args: MilestoneRemoveArgs): Promise<MilestoneOperationResult> {
		const name = normalizeMilestoneName(args.name);
		if (!name) {
			throw new MilestoneOperationError("Milestone name cannot be empty.", "VALIDATION_ERROR");
		}

		const fileMilestones = await this.listFileMilestones();
		const archivedMilestones = await this.listArchivedMilestones();
		const sourceMilestone = findActiveMilestoneByAlias(name, fileMilestones);
		if (!sourceMilestone) {
			throw new MilestoneOperationError(`Milestone not found: "${name}"`, "NOT_FOUND");
		}
		const hasTitleCollision = hasMilestoneTitleAliasCollision(sourceMilestone, [
			...fileMilestones,
			...archivedMilestones,
		]);
		const removeKeys = buildTaskMatchKeysForMilestone(name, sourceMilestone, !hasTitleCollision);
		const taskHandling = args.taskHandling ?? "clear";
		const reassignTo = normalizeMilestoneName(args.reassignTo ?? "");
		const targetMilestone =
			taskHandling === "reassign" ? findActiveMilestoneByAlias(reassignTo, fileMilestones) : undefined;
		const reassignedMilestone = targetMilestone?.id ?? "";

		if (taskHandling === "reassign") {
			if (!reassignTo) {
				throw new MilestoneOperationError("reassignTo is required when taskHandling is reassign.", "VALIDATION_ERROR");
			}
			if (!targetMilestone) {
				throw new MilestoneOperationError(`Target milestone not found: "${reassignTo}"`, "VALIDATION_ERROR");
			}
			if (milestoneKey(targetMilestone.id) === milestoneKey(sourceMilestone.id)) {
				throw new MilestoneOperationError(
					"reassignTo must be different from the removed milestone.",
					"VALIDATION_ERROR",
				);
			}
		}

		const tasks = taskHandling !== "keep" ? await this.listLocalTasks() : [];
		const matches =
			taskHandling !== "keep" ? tasks.filter((task) => removeKeys.has(milestoneKey(task.milestone ?? ""))) : [];
		const previousMilestones = new Map<string, string | undefined>();
		let updatedTaskIds: string[] = [];
		const updatedTaskFilePaths = new Set<string>();
		if (taskHandling !== "keep") {
			try {
				for (const task of matches) {
					previousMilestones.set(task.id, task.milestone);
					const updatedTask = await this.core.editTask(
						task.id,
						{ milestone: taskHandling === "reassign" ? reassignedMilestone : null },
						false,
						{ preserveUnknownFrontmatter: this.presentation.preserveUnknownTaskFrontmatter ?? false },
					);
					const taskFilePath = updatedTask.filePath ?? task.filePath;
					if (taskFilePath) {
						updatedTaskFilePaths.add(taskFilePath);
					}
					updatedTaskIds.push(task.id);
				}
				updatedTaskIds = updatedTaskIds.sort((a, b) => a.localeCompare(b));
			} catch {
				const rollbackFailures = await this.rollbackTaskMilestones(previousMilestones);
				const detailSuffix =
					rollbackFailures.length > 0 ? ` (failed rollback for: ${rollbackFailures.join(", ")})` : "";
				throw new MilestoneOperationError(
					`Failed while updating tasks for milestone removal "${sourceMilestone.title}"${detailSuffix}.`,
					"INTERNAL_ERROR",
				);
			}
		}

		const archiveResult = await this.core.archiveMilestone(sourceMilestone.id, false);
		if (!archiveResult.success) {
			let detailSuffix = "";
			if (taskHandling !== "keep") {
				const rollbackFailures = await this.rollbackTaskMilestones(previousMilestones);
				if (rollbackFailures.length > 0) {
					detailSuffix = ` (failed rollback for: ${rollbackFailures.join(", ")})`;
				}
			}
			throw new MilestoneOperationError(
				`Failed to archive milestone "${sourceMilestone.title}" before removal.${detailSuffix}`,
				"INTERNAL_ERROR",
			);
		}
		try {
			await this.commitMilestoneMutation(`backlog: Remove milestone ${sourceMilestone.id}`, {
				sourcePath: archiveResult.sourcePath,
				targetPath: archiveResult.targetPath,
				taskFilePaths: updatedTaskFilePaths,
			});
		} catch {
			const rollbackDetails: string[] = [];
			if (archiveResult.sourcePath && archiveResult.targetPath) {
				try {
					await moveFile(archiveResult.targetPath, archiveResult.sourcePath);
				} catch {
					rollbackDetails.push("failed to rollback milestone archive");
				}
			}
			if (taskHandling !== "keep") {
				const rollbackFailures = await this.rollbackTaskMilestones(previousMilestones);
				if (rollbackFailures.length > 0) {
					rollbackDetails.push(`failed rollback for: ${rollbackFailures.join(", ")}`);
				}
			}
			const detailSuffix = rollbackDetails.length > 0 ? ` (${rollbackDetails.join("; ")})` : "";
			throw new MilestoneOperationError(
				`Failed while finalizing milestone removal "${sourceMilestone.title}"${detailSuffix}.`,
				"INTERNAL_ERROR",
			);
		}

		const summaryLines: string[] = [`Removed milestone "${sourceMilestone.title}" (${sourceMilestone.id}).`];
		if (taskHandling === "keep") {
			summaryLines.push("Kept task milestone values unchanged (taskHandling=keep).");
		} else if (taskHandling === "reassign") {
			const targetSummary = `"${targetMilestone?.title}" (${reassignedMilestone})`;
			summaryLines.push(
				`Reassigned ${updatedTaskIds.length} local task${updatedTaskIds.length === 1 ? "" : "s"} to ${targetSummary}: ${formatTaskIdList(updatedTaskIds)}`,
			);
		} else {
			summaryLines.push(
				`Cleared milestone for ${updatedTaskIds.length} local task${updatedTaskIds.length === 1 ? "" : "s"}: ${formatTaskIdList(updatedTaskIds)}`,
			);
		}
		return {
			message: summaryLines.join("\n"),
			milestone: archiveResult.milestone,
			updatedTaskIds,
		};
	}

	/** Archive a milestone without changing task references. */
	async archive(args: MilestoneArchiveArgs): Promise<MilestoneOperationResult> {
		const name = normalizeMilestoneName(args.name);
		if (!name) {
			throw new MilestoneOperationError("Milestone name cannot be empty.", "VALIDATION_ERROR");
		}

		const result = await this.core.archiveMilestone(name);
		if (!result.success) {
			throw new MilestoneOperationError(`Milestone not found: "${name}"`, "NOT_FOUND");
		}

		const label = result.milestone?.title ?? name;
		const id = result.milestone?.id;

		return {
			message: `Archived milestone "${label}"${id ? ` (${id})` : ""}.`,
			milestone: result.milestone,
			updatedTaskIds: [],
		};
	}
}
