import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { compareSurfaces, validateManifest, writeComparison } from "./compare-surfaces.ts";
import { type CaptureTarget, captureIsolatedSurface } from "./surface-manifest.ts";

/** Capture an identified candidate and publish review artifacts without updating its baseline. */
export async function checkMiniSurface(target: CaptureTarget, baselinePath: string, output: string) {
	const baseline = validateManifest(JSON.parse(await readFile(baselinePath, "utf8")));
	if (baseline.manifestVersion !== 2)
		throw new Error("The mini gate requires a discovery and response baseline (version 2).");
	const candidate = await captureIsolatedSurface(target);
	const report = compareSurfaces(baseline, candidate);
	await writeComparison(report, output, [baselinePath], candidate);
	return report;
}

if (import.meta.main) {
	try {
		const { values } = parseArgs({
			args: process.argv.slice(2),
			options: {
				binary: { type: "string" },
				label: { type: "string" },
				revision: { type: "string" },
				baseline: { type: "string", default: resolve(import.meta.dir, "../docs/surfaces/mini-v1.53.0.json") },
				output: { type: "string" },
				help: { type: "boolean" },
			},
			strict: true,
			allowPositionals: false,
		});
		if (values.help)
			console.log(
				"Usage: bun scripts/check-mini-surface.ts --binary <compiled-mini> --label <build-label> --revision <source-revision> --output <report-prefix> [--baseline <manifest.json>]",
			);
		else {
			if (!values.binary || !values.label || !values.revision || !values.output)
				throw new Error("--binary, --label, --revision and --output are required.");
			const report = await checkMiniSurface(
				{ command: [resolve(values.binary)], cwd: process.cwd(), label: values.label, revision: values.revision },
				values.baseline,
				values.output,
			);
			console.log(
				`Mini surface changes: ${report.changes.length}. Artifacts: ${resolve(values.output)}.{candidate.json,json,md}`,
			);
			if (report.changes.length) process.exitCode = 1;
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
