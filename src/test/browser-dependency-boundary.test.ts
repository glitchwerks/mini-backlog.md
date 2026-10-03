import { expect, it } from "bun:test";
import { readdir, readFile, realpath } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { SyntaxKind } from "typescript/unstable/ast";
import { createScanner } from "typescript/unstable/ast/scanner";

const sourceRoot = await realpath(resolve(import.meta.dir, ".."));
const forbiddenRoots = [resolve(sourceRoot, "cli.ts"), resolve(sourceRoot, "commands"), resolve(sourceRoot, "mcp")];
const transpiler = new Bun.Transpiler({ loader: "tsx" });

/** Collect dependency paths without executing imported modules. */
function collectImportPaths(source: string): string[] {
	const paths = new Set(transpiler.scanImports(source).map((imported) => imported.path));
	// Bun omits type-only edges. The pinned TS scanner skips comments and keeps
	// string contents out of the token stream, including escaped module names.
	const scanner = createScanner(true, undefined, source);
	const templateBraces: number[] = [];
	const controlParens: boolean[] = [];
	let followsControlHeader = false;
	let previousToken = SyntaxKind.Unknown;
	for (let token = scanner.scan(); token !== SyntaxKind.EndOfFile; token = scanner.scan()) {
		// A bare hash in JSX text is not a private identifier. Rescan it so the
		// scanner advances rather than repeatedly returning the same token.
		if (token === SyntaxKind.PrivateIdentifier && scanner.getTokenStart() === scanner.getTokenEnd()) {
			token = scanner.reScanHashToken();
		}
		if (
			(token === SyntaxKind.SlashToken || token === SyntaxKind.SlashEqualsToken) &&
			(followsControlHeader ||
				[
					SyntaxKind.SemicolonToken,
					SyntaxKind.EqualsToken,
					SyntaxKind.OpenParenToken,
					SyntaxKind.OpenBraceToken,
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
				].includes(previousToken))
		)
			token = scanner.reScanSlashToken();
		// A slash after a control header starts its statement, whereas a slash
		// after a call or grouped expression is division. Track nested parentheses.
		followsControlHeader = token === SyntaxKind.CloseParenToken && (controlParens.pop() ?? false);
		if (token === SyntaxKind.OpenParenToken) {
			controlParens.push(
				[
					SyntaxKind.IfKeyword,
					SyntaxKind.WhileKeyword,
					SyntaxKind.ForKeyword,
					SyntaxKind.WithKeyword,
					SyntaxKind.SwitchKeyword,
					SyntaxKind.CatchKeyword,
				].includes(previousToken),
			);
		}
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
		// Preserve the control-header introducer across the optional await in for await (...).
		if (token !== SyntaxKind.AwaitKeyword || previousToken !== SyntaxKind.ForKeyword) previousToken = token;
		if (token !== SyntaxKind.FromKeyword && token !== SyntaxKind.ImportKeyword) continue;
		const path = scanner.lookAhead(() => {
			if (token === SyntaxKind.ImportKeyword) {
				let next = scanner.scan();
				if (next === SyntaxKind.TypeKeyword) next = scanner.scan();
				// Import-equals declarations have no `from`: import type M = require("...").
				if (
					next !== SyntaxKind.OpenParenToken &&
					(!scanner.isIdentifier() ||
						scanner.scan() !== SyntaxKind.EqualsToken ||
						scanner.scan() !== SyntaxKind.RequireKeyword ||
						scanner.scan() !== SyntaxKind.OpenParenToken)
				)
					return undefined;
			}
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
	'if (enabled) { type T = import("../mcp/types.ts").CallToolResult; }',
	'function matches(value: string) { type T = import("../mcp/types.ts").CallToolResult; }',
	'const ratio = (value) / (other as import("../mcp/types.ts").CallToolResult);',
	'import type M = require("../mcp/types.ts"); type T = M.CallToolResult;',
])("reports forbidden dependency in %s", async (source) => {
	const file = resolve(sourceRoot, "server/index.ts");
	expect(collectImportPaths(source)).toContain("../mcp/types.ts");
	expect(await collectBoundaryViolations([file], async () => source)).toEqual(["server/index.ts -> mcp/types.ts"]);
});

it.each([
	String.raw`if (enabled) /import("..\/mcp\/types.ts")/.test(value);`,
	String.raw`if ((enabled)) /import("..\/mcp\/types.ts")/.test(value);`,
	String.raw`for await (const value of values) /import("..\/mcp\/types.ts")/.test(value);`,
	String.raw`function matches(value: string) { /import("..\/mcp\/types.ts")/.test(value); }`,
	String.raw`const value = 1; /import("..\/mcp\/types.ts")/.test("x");`,
])("ignores regex import text at statement boundaries: %s", async (source) => {
	expect(collectImportPaths(source)).toEqual([]);
	expect(await collectBoundaryViolations([resolve(sourceRoot, "server/index.ts")], async () => source)).toEqual([]);
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

it.each([
	{
		source: 'import { BacklogToolError } from "../mcp/errors/mcp-errors.js"; console.log(BacklogToolError);',
		violation: "server/index.ts -> mcp/errors/mcp-errors.ts",
	},
	{
		source: 'import type { CallToolResult } from "../mcp/types.js";',
		violation: "server/index.ts -> mcp/types.ts",
	},
	{
		source: 'type T = import("../mcp/types.js").CallToolResult;',
		violation: "server/index.ts -> mcp/types.ts",
	},
])("reports forbidden .js imports resolved to TypeScript: $source", async ({ source, violation }) => {
	expect(await collectBoundaryViolations([resolve(sourceRoot, "server/index.ts")], async () => source)).toEqual([
		violation,
	]);
});

it.each([
	{
		entry: 'import { value } from "../web/components/TaskCard.js"; console.log(value);',
		bridge: "web/components/TaskCard.tsx",
		source: 'export { BacklogToolError as value } from "../../mcp/errors/mcp-errors.js";',
		violation: "web/components/TaskCard.tsx -> mcp/errors/mcp-errors.ts",
	},
	{
		entry: 'import type { T } from "../core/milestones.js";',
		bridge: "core/milestones.ts",
		source: 'export type T = import("../mcp/types.js").CallToolResult;',
		violation: "core/milestones.ts -> mcp/types.ts",
	},
])("follows .js imports through $bridge to forbidden modules", async ({ entry, bridge, source, violation }) => {
	const entryFile = resolve(sourceRoot, "server/index.ts");
	const sources = new Map([
		[entryFile, entry],
		[resolve(sourceRoot, bridge), source],
	]);
	expect(
		await collectBoundaryViolations([entryFile], async (file) => {
			const fixture = sources.get(file);
			if (fixture === undefined) throw new Error(`Unexpected fixture dependency: ${file}`);
			return fixture;
		}),
	).toEqual([violation]);
});

it.skipIf(process.platform !== "win32")("reports forbidden imports with Windows path casing", async () => {
	for (const { specifier, violation } of [
		{ specifier: "../MCP/types.ts", violation: "server/index.ts -> mcp/types.ts" },
		{ specifier: "../MCP/TYPES.TS", violation: "server/index.ts -> mcp/types.ts" },
		{ specifier: "../CLI.TS", violation: "server/index.ts -> cli.ts" },
	]) {
		const source = `type T = import("${specifier}");`;
		const violations = await collectBoundaryViolations([resolve(sourceRoot, "server/index.ts")], async () => source);
		expect(violations.map((edge) => edge.toLowerCase())).toEqual([violation]);
	}
});

/** Identify adapter modules that the browser cannot depend on. */
function isForbidden(file: string): boolean {
	// Windows realpath can retain the import's casing on its case-insensitive filesystem.
	const target = process.platform === "win32" ? file.toLowerCase() : file;
	return forbiddenRoots.some((root) => {
		const forbiddenRoot = process.platform === "win32" ? root.toLowerCase() : root;
		return target === forbiddenRoot || target.startsWith(`${forbiddenRoot}${sep}`);
	});
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
	let target: string;
	try {
		// Match Bun's extension substitution (.js -> .ts/.tsx) and directory resolution.
		target = Bun.resolveSync(specifier, dirname(fromFile));
	} catch (error) {
		if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") return null;
		throw error;
	}
	return [".ts", ".tsx"].includes(extname(target)) ? realpath(target) : null;
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
