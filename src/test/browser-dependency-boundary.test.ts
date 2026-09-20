import { expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const sourceRoot = resolve(import.meta.dir, "..");
const forbiddenRoots = [resolve(sourceRoot, "cli.ts"), resolve(sourceRoot, "commands"), resolve(sourceRoot, "mcp")];
const transpiler = new Bun.Transpiler({ loader: "tsx" });

/** Collect dependency paths without executing imported modules. */
function collectImportPaths(source: string): string[] {
	const paths = new Set(transpiler.scanImports(source).map((imported) => imported.path));
	// Bun omits type-only edges; retain explicit type imports and type re-exports too.
	const typeEdges =
		/\b(?:import|export)\s+(?:type\s+(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+)|\{[^}]*\btype\b[^}]*\})\s+from\s*["']([^"']+)["']/g;
	for (const match of source.matchAll(typeEdges)) {
		if (match[1]) paths.add(match[1]);
	}
	return [...paths];
}

it("collects runtime, dynamic, and type-only imports and re-exports", () => {
	const paths = collectImportPaths(`
		import type { A } from "./a";
		import { type B } from "./b";
		export type { C } from "./c";
		import { run } from "./runtime";
		export { value } from "./reexport";
		const pending = import("./dynamic");
		run(pending);
	`);
	expect(paths.sort()).toEqual(["./a", "./b", "./c", "./dynamic", "./reexport", "./runtime"]);
});

/** Identify adapter modules that the browser cannot depend on. */
function isForbidden(file: string): boolean {
	return forbiddenRoots.some((root) => file === root || file.startsWith(`${root}${sep}`));
}

/** Collect browser entry points deterministically, including components and type modules. */
async function collectTypeScriptFiles(directory: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) files.push(...(await collectTypeScriptFiles(path)));
		else if (entry.isFile() && [".ts", ".tsx"].includes(extname(path))) files.push(path);
	}
	return files.sort();
}

/** Resolve relative TypeScript imports without executing application code. */
async function resolveRelativeImport(fromFile: string, specifier: string): Promise<string | null> {
	if (!specifier.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
		if ([".ts", ".tsx"].includes(extname(candidate)) && (await Bun.file(candidate).exists())) return candidate;
	}
	return null;
}

it("keeps server and web imports outside CLI, commands, and MCP", async () => {
	const entries = [
		resolve(sourceRoot, "server/index.ts"),
		...(await collectTypeScriptFiles(resolve(sourceRoot, "web"))),
	];
	const queue = [...entries];
	const visited = new Set<string>();
	const violations: string[] = [];

	while (queue.length > 0) {
		const file = queue.pop();
		if (!file || visited.has(file)) continue;
		visited.add(file);
		const imports = collectImportPaths(await readFile(file, "utf8"));
		for (const imported of imports) {
			const target = await resolveRelativeImport(file, imported);
			if (!target) continue;
			if (isForbidden(target)) {
				violations.push(
					`${relative(sourceRoot, file).split(sep).join("/")} -> ${relative(sourceRoot, target).split(sep).join("/")}`,
				);
			} else queue.push(target);
		}
	}

	expect(violations.sort()).toEqual([]);
});
