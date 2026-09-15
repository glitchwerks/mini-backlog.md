import { expect, it } from "bun:test";
import {
	MINI_CLI_OPTIONS,
	MINI_MCP_TOOL_NAMES,
	MINI_TASK_CREATE_PROPERTIES,
	MINI_TASK_DETAIL_FIELDS,
	MINI_TASK_EDIT_PROPERTIES,
	MINI_TASK_LIST_PROPERTIES,
	MINI_TASK_SEARCH_PROPERTIES,
	MINI_TASK_SUMMARY_FIELDS,
} from "../mini/surface-policy.ts";

type PackageManifest = {
	bin: Record<string, string>;
	bugs: { url: string };
	name: string;
	repository: { url: string };
};

function restrictedSection(readme: string, heading: string): string {
	const start = readme.indexOf(`## ${heading}`);
	expect(start).toBeGreaterThanOrEqual(0);
	const end = readme.indexOf("\n## ", start + heading.length + 3);
	return readme.slice(start, end === -1 ? undefined : end);
}

function tableRows(section: string): string[][] {
	return section
		.split("\n")
		.filter((line) => line.startsWith("| ") && line.includes("`"))
		.map((line) =>
			line
				.slice(1, -1)
				.split("|")
				.map((cell) => cell.trim()),
		);
}

function codeValues(value: string): string[] {
	return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
}

it("keeps the published mini contract synchronized with the fail-closed policy", async () => {
	const pkg = (await Bun.file("package.json").json()) as PackageManifest;
	const readme = await Bun.file("README.md").text();

	expect(pkg.name).toBe("backlog.md");
	expect(pkg.bin).toEqual({ backlog: "scripts/cli.cjs" });
	expect(pkg.repository.url).toBe("git+https://github.com/glitchwerks/mini-backlog.md.git");
	expect(pkg.bugs.url).toBe("https://github.com/glitchwerks/mini-backlog.md/issues");

	const cliRows = tableRows(restrictedSection(readme, "CLI operations"));
	expect(
		Object.fromEntries(cliRows.map(([command, options]) => [codeValues(command ?? "")[0], codeValues(options ?? "")])),
	).toEqual(
		Object.fromEntries(
			Object.entries(MINI_CLI_OPTIONS).map(([command, options]) => [command || "backlog", [...options]]),
		),
	);

	const mcpRows = tableRows(restrictedSection(readme, "MCP operations"));
	expect(mcpRows.map(([tool]) => codeValues(tool ?? "")[0])).toEqual([...MINI_MCP_TOOL_NAMES]);

	const taskFields = Object.fromEntries(
		tableRows(restrictedSection(readme, "Task MCP fields")).map(([operation, fields]) => [
			codeValues(operation ?? "")[0],
			codeValues(fields ?? ""),
		]),
	);
	expect(taskFields).toEqual({
		task_create: [...MINI_TASK_CREATE_PROPERTIES],
		task_list: [...MINI_TASK_LIST_PROPERTIES],
		task_search: [...MINI_TASK_SEARCH_PROPERTIES],
		task_edit: [...MINI_TASK_EDIT_PROPERTIES],
		task_summary: [...MINI_TASK_SUMMARY_FIELDS],
		task_detail: [...MINI_TASK_DETAIL_FIELDS],
	});

	expect(readme).toContain("Excluded operations are absent from both discovery and invocation.");
	expect(readme).toContain("There is no switch that restores the full Backlog.md surface.");
	expect(readme).toContain("MrLesk/Backlog.md");
});
