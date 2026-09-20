import { expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { SyntaxKind } from "typescript/unstable/ast";
import { createScanner } from "typescript/unstable/ast/scanner";

const sourceRoot = resolve(import.meta.dir, "..");
const forbiddenRoots = [resolve(sourceRoot, "cli.ts"), resolve(sourceRoot, "commands"), resolve(sourceRoot, "mcp")];
const transpiler = new Bun.Transpiler({ loader: "tsx" });

/** Collect dependency paths without executing imported modules. */
function collectImportPaths(source: string): string[] {
	const paths = new Set(transpiler.scanImports(source).map((imported) => imported.path));
	// Bun omits type-only edges. The pinned TS scanner skips comments and keeps
	// string contents out of the token stream, including escaped module names.
	const scanner = createScanner(true, undefined, source);
	const templateBraces: number[] = [];
	let previousToken = SyntaxKind.Unknown;
	for (let token = scanner.scan(); token !== SyntaxKind.EndOfFile; token = scanner.scan()) {
		// A bare hash in JSX text is not a private identifier. Rescan it so the
		// scanner advances rather than repeatedly returning the same token.
		if (token === SyntaxKind.PrivateIdentifier && scanner.getTokenStart() === scanner.getTokenEnd()) {
			token = scanner.reScanHashToken();
		}
		if (
			(token === SyntaxKind.SlashToken || token === SyntaxKind.SlashEqualsToken) &&
			[
				SyntaxKind.EqualsToken,
				SyntaxKind.OpenParenToken,
				SyntaxKind.OpenBracketToken,
				SyntaxKind.CommaToken,
				SyntaxKind.ColonToken,
				SyntaxKind.QuestionToken,
				SyntaxKind.BarBarToken,
				SyntaxKind.AmpersandAmpersandToken,
				SyntaxKind.QuestionQuestionToken,
				SyntaxKind.ExclamationToken,
				SyntaxKind.ReturnKeyword,
				SyntaxKind.EqualsGreaterThanToken,
			].includes(previousToken)
		)
			token = scanner.reScanSlashToken();
		if (token === SyntaxKind.TemplateHead) templateBraces.push(0);
		else if (templateBraces.length > 0) {
			const index = templateBraces.length - 1;
			if (token === SyntaxKind.OpenBraceToken) templateBraces[index] = (templateBraces[index] ?? 0) + 1;
			else if (token === SyntaxKind.CloseBraceToken) {
				if (templateBraces[index] === 0) {
					// After an interpolation, resume string scanning instead of reading
					// template text as code. Nested templates keep their own brace depth.
					token = scanner.reScanTemplateToken(false);
					if (token === SyntaxKind.TemplateTail) templateBraces.pop();
				} else templateBraces[index] = (templateBraces[index] ?? 0) - 1;
			}
		}
		previousToken = token;
		if (token !== SyntaxKind.FromKeyword && token !== SyntaxKind.ImportKeyword) continue;
		const path = scanner.lookAhead(() => {
			if (token === SyntaxKind.ImportKeyword && scanner.scan() !== SyntaxKind.OpenParenToken) return undefined;
			return scanner.scan() === SyntaxKind.StringLiteral ? scanner.getTokenValue() : undefined;
		});
		if (path !== undefined) paths.add(path);
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

it.each([
	'type T = import("../mcp/types.ts").CallToolResult;',
	'import type /* shared */ { CallToolResult } from "../mcp/types.ts";',
	'export type /* shared */ { CallToolResult } from /* source */ "../mcp/types.ts";',
	// biome-ignore lint/suspicious/noTemplateCurlyInString: Literal source fixture, not test-time interpolation.
	'const template = `${{} as import("../mcp/types.ts").CallToolResult}`;',
	'const jsx = <span>#{1}</span>; type T = import("../mcp/types.ts").CallToolResult;',
])("reports forbidden dependency in %s", async (source) => {
	const file = resolve(sourceRoot, "server/index.ts");
	expect(collectImportPaths(source)).toContain("../mcp/types.ts");
	expect(await collectBoundaryViolations([file], async () => source)).toEqual(["server/index.ts -> mcp/types.ts"]);
});

it("ignores import declarations inside comments and strings", () => {
	const source = [
		'// import type { Fake } from "../mcp/comment.ts";',
		'/* export type { Fake } from "../mcp/block.ts"; */',
		"const quoted = 'import type { Fake } from \"../mcp/string.ts\";';",
		'const template = `export type { Fake } from "../mcp/template.ts";`;',
		// biome-ignore lint/suspicious/noTemplateCurlyInString: Literal source fixture, not test-time interpolation.
		'const interpolated = `prefix ${"value"} import type { Fake } from "../mcp/tail.ts";`;',
		'const regex = /import type { Fake } from "fake"/;',
	].join("\n");
	expect(collectImportPaths(source)).toEqual([]);
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

/** Traverse real resolved dependencies and report every forbidden adapter edge. */
async function collectBoundaryViolations(
	entries: string[],
	readSource: (file: string) => Promise<string> = (file) => readFile(file, "utf8"),
): Promise<string[]> {
	const queue = [...entries];
	const visited = new Set<string>();
	const violations: string[] = [];

	while (queue.length > 0) {
		const file = queue.pop();
		if (!file || visited.has(file)) continue;
		visited.add(file);
		const imports = collectImportPaths(await readSource(file));
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

	return violations.sort();
}

it("keeps server and web imports outside CLI, commands, and MCP", async () => {
	const entries = [
		resolve(sourceRoot, "server/index.ts"),
		...(await collectTypeScriptFiles(resolve(sourceRoot, "web"))),
	];
	expect(await collectBoundaryViolations(entries)).toEqual([]);
});
