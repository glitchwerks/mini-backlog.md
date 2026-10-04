import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { canonicalJson, captureSurface } from "./surface-manifest.ts";

try {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			target: { type: "string" },
			output: { type: "string" },
			help: { type: "boolean" },
			responses: { type: "boolean" },
		},
		strict: true,
		allowPositionals: false,
	});
	if (values.help) {
		console.log("Usage: bun scripts/capture-surface.ts --target <target.json> --output <manifest.json> [--responses]");
	} else {
		if (!values.target || !values.output) throw new Error("--target and --output are required. Use --help for usage.");
		const manifest = await captureSurface(JSON.parse(await readFile(values.target, "utf8")), values.responses);
		const output = resolve(values.output);
		await mkdir(dirname(output), { recursive: true });
		const temporary = `${output}.${randomUUID()}.tmp`;
		try {
			await writeFile(temporary, canonicalJson(manifest), { flag: "wx" });
			await rename(temporary, output);
		} finally {
			await rm(temporary, { force: true });
		}
		console.log(`Captured surface: ${output}`);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
