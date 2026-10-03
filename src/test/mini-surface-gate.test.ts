import { expect, test } from "bun:test";
import { link, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkMiniSurface } from "../../scripts/check-mini-surface.ts";
import { compareSurfaces, writeComparison } from "../../scripts/compare-surfaces.ts";

test("checks a real mini candidate, reports drift and preserves baseline and caller project", async () => {
	const directory = await mkdtemp(join(tmpdir(), "mini-surface-gate-"));
	try {
		const baselinePath = join(directory, "baseline.json");
		const baseline = await readFile("docs/surfaces/mini-v1.53.0.json", "utf8");
		await writeFile(baselinePath, baseline);
		await writeFile(join(directory, "sentinel.txt"), "existing project");
		const target = {
			command: [process.execPath, resolve("src/bin/cli.ts")],
			cwd: directory,
			label: "candidate",
			revision: "test",
		};
		const output = join(directory, "reports/candidate");
		const report = await checkMiniSurface(target, baselinePath, output);
		expect(report.changes).toEqual([]);
		const candidate = JSON.parse(await readFile(`${output}.candidate.json`, "utf8"));
		expect(candidate.manifestVersion).toBe(2);
		expect(candidate.identity.revision).toBe("test");
		expect(await readFile(baselinePath, "utf8")).toBe(baseline);
		const changed = JSON.parse(baseline);
		changed.surface.mcp.tools.find((tool: { name: string }) => tool.name === "task_view").inputSchema.required = [];
		const changedText = JSON.stringify(changed);
		await writeFile(baselinePath, changedText);
		const drift = await checkMiniSurface(target, baselinePath, output);
		expect(drift.changes).toHaveLength(1);
		expect(drift.changes[0]?.path).toBe("/mcp/tools/task_view/inputSchema/required");
		expect(JSON.parse(await readFile(`${output}.json`, "utf8")).changes).toEqual(drift.changes);
		expect(await readFile(`${output}.md`, "utf8")).toContain("required");
		expect(await readFile(baselinePath, "utf8")).toBe(changedText);
		expect(await Bun.file(join(directory, "backlog/config.yml")).exists()).toBe(false);
		expect(await readFile(join(directory, "sentinel.txt"), "utf8")).toBe("existing project");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 90000);

test("rejects an incomplete baseline before invoking the candidate or writing reports", async () => {
	const directory = await mkdtemp(join(tmpdir(), "mini-surface-invalid-"));
	try {
		const baselinePath = join(directory, "baseline.json");
		await writeFile(baselinePath, "{}");
		await expect(
			checkMiniSurface(
				{ command: ["missing-executable"], cwd: directory, label: "candidate" },
				baselinePath,
				join(directory, "report"),
			),
		).rejects.toThrow();
		expect(await readFile(baselinePath, "utf8")).toBe("{}");
		expect(await Bun.file(join(directory, "report.candidate.json")).exists()).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("protects the baseline from a hard-linked candidate artifact destination", async () => {
	const directory = await mkdtemp(join(tmpdir(), "mini-surface-alias-"));
	try {
		const baselinePath = join(directory, "baseline.json");
		const baseline = await readFile("docs/surfaces/mini-v1.53.0.json", "utf8");
		await writeFile(baselinePath, baseline);
		const output = join(directory, "report");
		await link(baselinePath, `${output}.candidate.json`);
		const candidate = JSON.parse(baseline);
		await expect(
			writeComparison(compareSurfaces(candidate, candidate), output, [baselinePath], candidate),
		).rejects.toThrow(/overwrite/);
		expect(await readFile(baselinePath, "utf8")).toBe(baseline);
		expect(await Bun.file(`${output}.json`).exists()).toBe(false);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
