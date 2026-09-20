import type { Core } from "../../../core/backlog.ts";
import {
	type MilestoneAddArgs,
	type MilestoneArchiveArgs,
	MilestoneOperationError,
	type MilestoneOperationResult,
	MilestoneOperations,
	type MilestoneRemoveArgs,
	type MilestoneRenameArgs,
} from "../../../core/milestone-operations.ts";
import {
	buildMilestoneMatchKeys,
	formatMilestoneDescription,
	milestoneKey,
	normalizeMilestoneName,
} from "../../../core/milestones.ts";
import type { SurfaceMode } from "../../../mini/runtime.ts";
import type { Milestone, Task } from "../../../types/index.ts";
import { formatUtcDateForDisplay } from "../../../utils/utc-date-display.ts";
import { BacklogToolError } from "../../errors/mcp-errors.ts";
import type { CallToolResult } from "../../types.ts";

export type {
	MilestoneAddArgs,
	MilestoneArchiveArgs,
	MilestoneRemoveArgs,
	MilestoneRenameArgs,
} from "../../../core/milestone-operations.ts";

function collectArchivedMilestoneKeys(archivedMilestones: Milestone[], activeMilestones: Milestone[]): string[] {
	const keys = new Set<string>();
	const activeTitleKeys = new Set(activeMilestones.map((milestone) => milestoneKey(milestone.title)).filter(Boolean));

	for (const milestone of archivedMilestones) {
		const idKey = milestoneKey(milestone.id);
		if (idKey) {
			keys.add(idKey);
		}
		const titleKey = milestoneKey(milestone.title);
		if (titleKey && !activeTitleKeys.has(titleKey)) {
			keys.add(titleKey);
		}
	}

	return Array.from(keys);
}

function formatListBlock(title: string, items: string[]): string {
	if (items.length === 0) {
		return `${title}\n  (none)`;
	}
	return `${title}\n${items.map((item) => `  - ${item}`).join("\n")}`;
}

function resolveMilestoneValueForReporting(
	value: string,
	activeMilestones: Milestone[],
	archivedMilestones: Milestone[],
): string {
	const normalized = normalizeMilestoneName(value);
	if (!normalized) {
		return "";
	}
	const inputKey = milestoneKey(normalized);
	const looksLikeMilestoneId = /^\d+$/.test(normalized) || /^m-\d+$/i.test(normalized);
	const canonicalInputId = looksLikeMilestoneId
		? `m-${String(Number.parseInt(normalized.replace(/^m-/i, ""), 10))}`
		: null;
	const aliasKeys = new Set<string>([inputKey]);
	if (canonicalInputId) {
		const numericAlias = canonicalInputId.replace(/^m-/, "");
		aliasKeys.add(canonicalInputId);
		aliasKeys.add(numericAlias);
	}

	const idMatchesAlias = (milestoneId: string): boolean => {
		const idKey = milestoneKey(milestoneId);
		if (aliasKeys.has(idKey)) {
			return true;
		}
		const idMatch = milestoneId.trim().match(/^m-(\d+)$/i);
		if (!idMatch?.[1]) {
			return false;
		}
		const numericAlias = String(Number.parseInt(idMatch[1], 10));
		return aliasKeys.has(`m-${numericAlias}`) || aliasKeys.has(numericAlias);
	};
	const findIdMatch = (milestones: Milestone[]): Milestone | undefined => {
		const rawExactMatch = milestones.find((milestone) => milestoneKey(milestone.id) === inputKey);
		if (rawExactMatch) {
			return rawExactMatch;
		}
		if (canonicalInputId) {
			const canonicalRawMatch = milestones.find((milestone) => milestoneKey(milestone.id) === canonicalInputId);
			if (canonicalRawMatch) {
				return canonicalRawMatch;
			}
		}
		return milestones.find((milestone) => idMatchesAlias(milestone.id));
	};
	const findUniqueTitleMatch = (milestones: Milestone[]): Milestone | undefined => {
		const titleMatches = milestones.filter((milestone) => milestoneKey(milestone.title) === inputKey);
		return titleMatches.length === 1 ? titleMatches[0] : undefined;
	};

	const activeTitleMatches = activeMilestones.filter((milestone) => milestoneKey(milestone.title) === inputKey);
	if (looksLikeMilestoneId) {
		const activeIdMatch = findIdMatch(activeMilestones);
		if (activeIdMatch) {
			return activeIdMatch.id;
		}
		const archivedIdMatch = findIdMatch(archivedMilestones);
		if (archivedIdMatch) {
			return archivedIdMatch.id;
		}
		if (activeTitleMatches.length === 1) {
			return activeTitleMatches[0]?.id ?? normalized;
		}
		if (activeTitleMatches.length > 1) {
			return normalized;
		}
		return findUniqueTitleMatch(archivedMilestones)?.id ?? normalized;
	}

	const activeTitleMatch = findUniqueTitleMatch(activeMilestones);
	if (activeTitleMatch) {
		return activeTitleMatch.id;
	}
	if (activeTitleMatches.length > 1) {
		return normalized;
	}
	const activeIdMatch = findIdMatch(activeMilestones);
	if (activeIdMatch) {
		return activeIdMatch.id;
	}
	const archivedTitleMatch = findUniqueTitleMatch(archivedMilestones);
	if (archivedTitleMatch) {
		return archivedTitleMatch.id;
	}
	return findIdMatch(archivedMilestones)?.id ?? normalized;
}

export class MilestoneHandlers {
	private readonly operations: MilestoneOperations;

	constructor(
		private readonly core: Core,
		private readonly surface: SurfaceMode = "full",
	) {
		this.operations = new MilestoneOperations(core, {
			preserveUnknownTaskFrontmatter: surface === "mini",
			includeExtendedSummary: surface === "full",
		});
	}

	/** Preserve MCP envelopes and domain error classification at the transport boundary. */
	private async mutationResult(operation: Promise<MilestoneOperationResult>): Promise<CallToolResult> {
		try {
			const result = await operation;
			return { content: [{ type: "text", text: result.message }] };
		} catch (error) {
			if (error instanceof MilestoneOperationError) {
				throw new BacklogToolError(error.message, error.code);
			}
			throw error;
		}
	}

	private async listLocalTasks(): Promise<Task[]> {
		return await this.core.filesystem.listTasks();
	}

	private async listFileMilestones(): Promise<Milestone[]> {
		return await this.core.filesystem.listMilestones();
	}

	private async listArchivedMilestones(): Promise<Milestone[]> {
		return await this.core.filesystem.listArchivedMilestones();
	}

	async listMilestones(): Promise<CallToolResult> {
		// Get file-based milestones
		const fileMilestones = await this.listFileMilestones();
		const archivedMilestones = await this.listArchivedMilestones();
		const reservedIdKeys = new Set<string>();
		for (const milestone of [...fileMilestones, ...archivedMilestones]) {
			for (const key of buildMilestoneMatchKeys(milestone.id, [])) {
				reservedIdKeys.add(key);
			}
		}
		const activeTitleCounts = new Map<string, number>();
		for (const milestone of fileMilestones) {
			const titleKey = milestoneKey(milestone.title);
			if (!titleKey) continue;
			activeTitleCounts.set(titleKey, (activeTitleCounts.get(titleKey) ?? 0) + 1);
		}
		const fileMilestoneKeys = new Set<string>();
		for (const milestone of fileMilestones) {
			for (const key of buildMilestoneMatchKeys(milestone.id, [])) {
				fileMilestoneKeys.add(key);
			}
			const titleKey = milestoneKey(milestone.title);
			if (titleKey && !reservedIdKeys.has(titleKey) && activeTitleCounts.get(titleKey) === 1) {
				fileMilestoneKeys.add(titleKey);
			}
		}
		const archivedKeys = new Set<string>(collectArchivedMilestoneKeys(archivedMilestones, fileMilestones));

		// Get milestones discovered from tasks
		const tasks = await this.listLocalTasks();
		const discoveredByKey = new Map<string, string>();
		for (const task of tasks) {
			const normalized = normalizeMilestoneName(task.milestone ?? "");
			if (!normalized) continue;
			const canonicalValue = resolveMilestoneValueForReporting(normalized, fileMilestones, archivedMilestones);
			const key = milestoneKey(canonicalValue);
			if (!discoveredByKey.has(key)) {
				discoveredByKey.set(key, canonicalValue);
			}
		}

		const unconfigured = Array.from(discoveredByKey.entries())
			.filter(([key]) => !fileMilestoneKeys.has(key) && !archivedKeys.has(key))
			.map(([, value]) => value)
			.sort((a, b) => a.localeCompare(b));
		const archivedTaskValues = Array.from(discoveredByKey.entries())
			.filter(([key]) => !fileMilestoneKeys.has(key) && archivedKeys.has(key))
			.map(([, value]) => value)
			.sort((a, b) => a.localeCompare(b));

		const blocks: string[] = [];
		const milestoneLines = fileMilestones.map((milestone) => {
			if (this.surface === "mini") {
				return `${milestone.id}: ${milestone.title}${formatMilestoneDescription(milestone.description)}`;
			}
			return milestone.dueDate
				? `${milestone.id}: ${milestone.title} (due ${formatUtcDateForDisplay(milestone.dueDate)})`
				: `${milestone.id}: ${milestone.title}`;
		});
		blocks.push(formatListBlock(`Milestones (${fileMilestones.length}):`, milestoneLines));
		blocks.push(formatListBlock(`Milestones found on tasks without files (${unconfigured.length}):`, unconfigured));
		if (this.surface === "full") {
			blocks.push(
				formatListBlock(`Archived milestone values still on tasks (${archivedTaskValues.length}):`, archivedTaskValues),
			);
			blocks.push(
				"Hint: use milestone_add to create milestone files, milestone_rename / milestone_remove to manage, milestone_archive to archive.",
			);
		} else {
			blocks.push(
				"Hint: use milestone_add to create milestone files and milestone_rename / milestone_remove to manage them.",
			);
		}

		return {
			content: [
				{
					type: "text",
					text: blocks.join("\n\n"),
				},
			],
		};
	}

	async addMilestone(args: MilestoneAddArgs): Promise<CallToolResult> {
		return this.mutationResult(this.operations.add(args));
	}

	async renameMilestone(args: MilestoneRenameArgs): Promise<CallToolResult> {
		return this.mutationResult(this.operations.rename(args));
	}

	async removeMilestone(args: MilestoneRemoveArgs): Promise<CallToolResult> {
		return this.mutationResult(this.operations.remove(args));
	}

	async archiveMilestone(args: MilestoneArchiveArgs): Promise<CallToolResult> {
		return this.mutationResult(this.operations.archive(args));
	}
}
