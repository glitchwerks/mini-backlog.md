# Mini Backlog Browser Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the complete upstream browser to mini-backlog.md while keeping every non-browser CLI and MCP restriction intact and making the browser/server independent of hidden CLI, command, and MCP modules.

**Architecture:** The existing `backlog browser` entry remains the only launcher, but mini's positive surface policy admits its two public long options. Browser HTTP handlers call a new transport-neutral milestone operation layer in `src/core`; CLI and MCP become thin adapters over the same operations. A recursive import-graph test makes the browser/server boundary executable, while source and compiled integration tests prove that the unrestricted browser actually launches.

**Tech Stack:** Bun 1.3, TypeScript 5, Commander, Bun HTTP/WebSocket server, React/Vite browser bundle, Bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md`

## Global Constraints

- Preserve the full existing browser UI and HTTP API; do not add mini-only browser filtering. Source: `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L52-L56`.
- Preserve the exact positive allowlists for every CLI command, MCP tool, schema, resource, prompt, and output other than the new browser command. Source: `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L42-L60`.
- No file reachable through a relative import from `src/server` or `src/web` may be `src/cli.ts` or live under `src/commands` or `src/mcp`. Source: `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L52-L56`.
- Core milestone operations must not import mini runtime state or return MCP envelopes. Source: `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L70-L78`.
- Follow red-green-refactor for every task and commit each completed task with the project task ID.
- Do not broaden this work to the unrelated Windows baseline failures already recorded on BACK-688. Source: `backlog/tasks/back-688 - Restore-the-full-upstream-browser-interface.md:L42-L46`.

---

## Task 1: Restore the Browser Command in the Fail-Closed Mini Policy

**Files:**

- Modify: `src/test/mini-cli-surface.test.ts:12-73`
- Modify: `src/test/mini-cli-surface.test.ts:107-165`
- Modify: `src/mini/surface-policy.ts:6-104`

The upstream command already launches the shared server, validates the project root, selects a port, honors `--no-open`, and binds the server through the existing implementation. This task changes only mini's policy and exact contract tests. Source: `src/cli.ts:L5870-L5948`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L64-L68`.

- [ ] **Step 1: Change the root-surface test to require `browser`**

Update the exact command list and allowed-command loop, and remove `browser` from both hidden-command tables:

```ts
expect(rootCommands).toEqual(["browser", "doc", "mcp", "milestone", "search", "task"]);
for (const allowed of ["task", "search", "doc", "milestone", "mcp", "browser"]) {
	expect(output).toContain(allowed);
}
```

- [ ] **Step 2: Add a browser-specific exact help assertion**

Keep the generic `MINI_CLI_OPTIONS` parameterized test, and add a focused assertion that catches leaked aliases or internal flags:

```ts
it("publishes only the browser's approved long options", async () => {
	const result = await runMini("browser", "--help");
	const help = result.stdout.toString();

	expect(result.exitCode).toBe(0);
	expect([...help.matchAll(/^ {2}(--[\w-]+)/gm)].map((match) => match[1]).sort()).toEqual([
		"--help",
		"--no-open",
		"--port",
	]);
	expect(help).not.toContain("-p,");
	expect(help).not.toContain("--non-interactive");
});
```

- [ ] **Step 3: Run the surface test and confirm the red state**

Run:

```text
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
```

Expected: failure because `browser` is absent from mini root help and `MINI_CLI_OPTIONS`.

- [ ] **Step 4: Add browser to the positive policy**

Add exactly these entries:

```ts
export const MINI_CLI_OPTIONS = freezeStringLists({
	"": ["--version"],
	browser: ["--port", "--no-open"],
	// existing entries remain unchanged
} as const);

export const MINI_CLI_DESCRIPTIONS = Object.freeze({
	"": "mini-backlog.md - restricted CLI/MCP with the full browser interface",
	browser: "start the browser interface",
	// existing entries remain unchanged
} as const);
```

Do not add `-p` or `--non-interactive`; Commander pruning intentionally exposes only exact long-option names from the policy. Source: `src/mini/commander-policy.ts:L37-L66`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L44-L50`.

- [ ] **Step 5: Re-run the focused test and check formatting**

Run:

```text
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
bun run check src/mini/surface-policy.ts src/test/mini-cli-surface.test.ts
```

Expected: both commands pass.

- [ ] **Step 6: Commit the policy restoration**

```text
git add src/mini/surface-policy.ts src/test/mini-cli-surface.test.ts
git commit -m "BACK-688 - Restore browser command policy"
```

---

## Task 2: Consolidate Milestone Alias Resolution in Core

**Files:**

- Create: `src/test/milestone-resolution.test.ts`
- Modify: `src/core/milestones.ts:1-207`
- Modify: `src/mcp/tools/milestones/handlers.ts:1-120`
- Delete: `src/mcp/utils/milestone-resolution.ts`

The MCP utility duplicates normalization and ID/title alias rules already owned by `src/core/milestones.ts`. Moving those exports first makes the subsequent operation extraction smaller and prevents an accidental transitive MCP dependency. Source: `src/core/milestones.ts:L1-L207`; `src/mcp/utils/milestone-resolution.ts:L1-L150`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L70-L78`.

- [ ] **Step 1: Add behavior-locking tests against the intended core exports**

Create `src/test/milestone-resolution.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
	buildMilestoneMatchKeys,
	keySetsIntersect,
	resolveMilestoneStorageValue,
} from "../core/milestones.ts";
import type { Milestone } from "../types/index.ts";

const milestones: Milestone[] = [
	{ id: "m-1", title: "Launch", description: "", rawContent: "" },
	{ id: "m-2", title: "m-1", description: "", rawContent: "" },
];

describe("core milestone alias resolution", () => {
	it("resolves numeric and canonical IDs before a colliding title", () => {
		expect(resolveMilestoneStorageValue("1", milestones)).toBe("m-1");
		expect(resolveMilestoneStorageValue("m-1", milestones)).toBe("m-1");
	});

	it("resolves a unique title to its storage ID", () => {
		expect(resolveMilestoneStorageValue("Launch", milestones)).toBe("m-1");
	});

	it("builds intersecting keys for numeric aliases", () => {
		expect(keySetsIntersect(buildMilestoneMatchKeys("1", milestones), new Set(["m-1"]))).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test and confirm the red state**

Run:

```text
bun test --timeout=10000 src/test/milestone-resolution.test.ts
```

Expected: TypeScript/module failure because the three exports are not yet available from core.

- [ ] **Step 3: Move the alias helpers into `src/core/milestones.ts`**

Move, without semantic redesign, these functions from the MCP utility:

```ts
function buildMilestoneLookupKeys(name: string): string[];
function milestoneIdMatchesLookupKeys(milestoneId: string, lookupKeys: Set<string>): boolean;
function canonicalMilestoneId(value: string): string | null;
function findMatchingMilestoneId(name: string, milestones: Milestone[]): Milestone | undefined;
function findMatchingMilestone(name: string, milestones: Milestone[]): Milestone | undefined;
export function resolveMilestoneStorageValue(name: string, milestones: Milestone[]): string;
export function buildMilestoneMatchKeys(name: string, milestones: Milestone[]): Set<string>;
export function keySetsIntersect(left: Set<string>, right: Set<string>): boolean;
```

Reuse the existing exported `normalizeMilestoneName` and `milestoneKey` instead of copying them. Preserve the current rule that exact/canonical IDs win over ID-shaped titles.

- [ ] **Step 4: Point the MCP handler at core and remove the obsolete utility**

Replace its utility import with:

```ts
import {
	buildMilestoneMatchKeys,
	keySetsIntersect,
	milestoneKey,
	normalizeMilestoneName,
	resolveMilestoneStorageValue,
} from "../../../core/milestones.ts";
```

Delete `src/mcp/utils/milestone-resolution.ts` after `rg -n "milestone-resolution" src` returns no remaining consumers.

- [ ] **Step 5: Run alias and existing milestone parity tests**

Run:

```text
bun test --timeout=10000 src/test/milestone-resolution.test.ts src/test/mcp-milestones.test.ts src/test/cli-milestone-management.test.ts
bun run check src/core/milestones.ts src/mcp/tools/milestones/handlers.ts src/test/milestone-resolution.test.ts
```

Expected: all tests and checks pass with unchanged milestone behavior.

- [ ] **Step 6: Commit the core alias consolidation**

```text
git add src/core/milestones.ts src/mcp/tools/milestones/handlers.ts src/test/milestone-resolution.test.ts src/mcp/utils/milestone-resolution.ts
git commit -m "BACK-688 - Move milestone alias resolution into core"
```

---

## Task 3: Extract Transport-Neutral Milestone Operations

**Files:**

- Create: `src/core/milestone-operations.ts`
- Create: `src/test/core-milestone-operations.test.ts`
- Modify: `src/core/milestones.ts`
- Modify: `src/mcp/tools/milestones/handlers.ts:1-780`
- Modify: `src/cli.ts:39-64`
- Modify: `src/cli.ts:526-546`
- Modify: `src/cli.ts:4428-4552`
- Modify: `src/test/cli-milestone-management.test.ts:1-240`

Rename/remove currently coordinate task edits, rollback, file moves, and auto-commit inside the MCP handler, while the CLI imports that handler directly. The operation layer must preserve those semantics while returning a transport-neutral result. Source: `src/mcp/tools/milestones/handlers.ts:L225-L279`; `src/mcp/tools/milestones/handlers.ts:L375-L725`; `src/cli.ts:L54-L55`; `src/cli.ts:L537-L541`.

- [ ] **Step 1: Add direct core-operation tests before moving implementation**

Create a fixture with a temporary Backlog project, `Core`, and `MilestoneOperations`. Cover all four mutations and the public result/error contract:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir } from "node:fs/promises";
import { Core } from "../core/backlog.ts";
import {
	MilestoneOperationError,
	MilestoneOperations,
} from "../core/milestone-operations.ts";
import { createUniqueTestDir, safeCleanup } from "./test-utils.ts";

describe("core milestone operations", () => {
	it("adds and archives a due-dated milestone without transport envelopes", async () => {
		const added = await operations.add({ name: "Launch", dueDate: "2026-10-01" });
		expect(added.milestone).toMatchObject({ title: "Launch", dueDate: "2026-10-01" });
		expect(added.updatedTaskIds).toEqual([]);
		expect(added).not.toHaveProperty("content");

		const archived = await operations.archive({ name: added.milestone?.id ?? "" });
		expect(archived.message).toContain("Archived milestone");
	});

	it("renames a milestone and returns sorted updated task IDs", async () => {
		// Create the milestone and two referencing tasks through Core before the assertion.
		const result = await operations.rename({ from: "Launch", to: "Release" });
		expect(result.updatedTaskIds).toEqual([...result.updatedTaskIds].sort());
		expect(result.milestone?.title).toBe("Release");
	});

	it("uses stable domain error codes", async () => {
		await expect(operations.archive({ name: "missing" })).rejects.toMatchObject<MilestoneOperationError>({
			code: "NOT_FOUND",
		});
	});
});
```

Use the same config fields and cleanup helpers as `src/test/server-milestone-broadcast.test.ts:L12-L43`; create task fixtures using `Core.createTask` rather than hand-writing task files.

- [ ] **Step 2: Run the new test and confirm the red state**

Run:

```text
bun test --timeout=10000 src/test/core-milestone-operations.test.ts
```

Expected: module-not-found failure for `src/core/milestone-operations.ts`.

- [ ] **Step 3: Define the core API and errors**

Create the following public contract in `src/core/milestone-operations.ts`:

```ts
export type MilestoneOperationErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

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
	preserveUnknownTaskFrontmatter?: boolean;
	includeExtendedSummary?: boolean;
};

export class MilestoneOperations {
	constructor(
		private readonly core: Core,
		private readonly presentation: MilestoneOperationPresentation = {},
	) {}

	async add(args: MilestoneAddArgs): Promise<MilestoneOperationResult>;
	async rename(args: MilestoneRenameArgs): Promise<MilestoneOperationResult>;
	async remove(args: MilestoneRemoveArgs): Promise<MilestoneOperationResult>;
	async archive(args: MilestoneArchiveArgs): Promise<MilestoneOperationResult>;
}
```

Keep the mutation argument types beside the operations. The boolean presentation settings are supplied by adapters; the core module must not import `SurfaceMode` or `mini/runtime.ts`.

- [ ] **Step 4: Move mutation semantics from `MilestoneHandlers` into core**

Move these existing pieces intact before simplifying:

- active milestone lookup and task match-key helpers;
- task listing and rollback;
- auto-commit staging/reset behavior;
- add, rename, remove, and archive bodies;
- due-date validation and mutation summary construction.

Translate `BacklogToolError` to `MilestoneOperationError`. Translate MCP envelopes to the exact result object, for example:

```ts
return {
	message: `Created milestone "${milestone.title}" (${milestone.id}).${dueSummary}`,
	milestone,
	updatedTaskIds: [],
};
```

For rename/remove, return the final milestone when it exists and the already-sorted `updatedTaskIds`. Continue composing `Core.renameMilestone` and `Core.archiveMilestone`; do not duplicate their persistence logic. Source: `src/core/backlog.ts:L3379-L3454`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L70-L78`.

- [ ] **Step 5: Convert the MCP mutation methods into thin wrappers**

Retain MCP-only list formatting in `MilestoneHandlers`, but instantiate `MilestoneOperations` once and wrap mutation messages:

```ts
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

private mutationResult(result: MilestoneOperationResult): CallToolResult {
	return { content: [{ type: "text", text: result.message }] };
}

async addMilestone(args: MilestoneAddArgs): Promise<CallToolResult> {
	return this.mutationResult(await this.operations.add(args));
}
```

Apply the same adapter pattern to rename, remove, and archive. Keep MCP registration and mini filtering unchanged.

- [ ] **Step 6: Make the CLI call core operations directly**

Move `formatMilestoneDescription` to `src/core/milestones.ts` so the CLI has no reason to import the MCP handler. Replace `runMilestoneMutation` with:

```ts
async function runMilestoneMutation(
	action: (operations: MilestoneOperations) => Promise<MilestoneOperationResult>,
): Promise<void> {
	const cwd = await requireProjectRoot();
	const isMini = getActiveSurfaceMode() === "mini";
	const operations = new MilestoneOperations(new Core(cwd), {
		preserveUnknownTaskFrontmatter: isMini,
		includeExtendedSummary: !isMini,
	});

	try {
		console.log((await action(operations)).message);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
```

Change the four actions to `operations.add`, `operations.rename`, `operations.remove`, and `operations.archive`. Verify with `rg -n "mcp/|MilestoneHandlers|CallToolResult" src/cli.ts` that no milestone mutation dependency on MCP remains; investigate any unrelated MCP import before removing it.

- [ ] **Step 7: Update parity coverage to include the direct core adapter**

Extend `src/test/cli-milestone-management.test.ts` so the same add/rename/remove sequence is run through `MilestoneOperations` and `MilestoneHandlers`, and assert the persisted milestones/tasks match. Keep existing CLI assertions unchanged.

- [ ] **Step 8: Run core, CLI, and MCP milestone suites**

Run:

```text
bun test --timeout=10000 src/test/core-milestone-operations.test.ts src/test/mcp-milestones.test.ts src/test/cli-milestone-management.test.ts
bun run check src/core/milestone-operations.ts src/core/milestones.ts src/mcp/tools/milestones/handlers.ts src/cli.ts src/test/core-milestone-operations.test.ts src/test/cli-milestone-management.test.ts
bunx tsc --noEmit
```

Expected: all focused tests, Biome checks, and type checking pass.

- [ ] **Step 9: Commit the operation extraction**

```text
git add src/core/milestone-operations.ts src/core/milestones.ts src/mcp/tools/milestones/handlers.ts src/cli.ts src/test/core-milestone-operations.test.ts src/test/cli-milestone-management.test.ts
git commit -m "BACK-688 - Extract core milestone operations"
```

---

## Task 4: Decouple the Browser Server and Prove the Full HTTP Surface

**Files:**

- Create: `src/test/browser-dependency-boundary.test.ts`
- Create: `src/test/server-mini-browser-surface.test.ts`
- Modify: `src/server/index.ts:1-24`
- Modify: `src/server/index.ts:1568-1779`
- Modify: `src/test/server-milestone-broadcast.test.ts:59-84`

The server currently imports `BacklogToolError` and `MilestoneHandlers`, and milestone create duplicates alias validation. The browser must instead use the core operation layer for all four mutations and keep request parsing local to HTTP. Source: `src/server/index.ts:L1-L13`; `src/server/index.ts:L1568-L1612`; `src/server/index.ts:L1615-L1779`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L80-L86`.

- [ ] **Step 1: Add a recursive import-boundary test**

Create `src/test/browser-dependency-boundary.test.ts`. Use TypeScript's preprocessing API so static imports, exports, and dynamic imports are collected without executing application code:

```ts
import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const sourceRoot = resolve(import.meta.dir, "..");
const forbiddenRoots = [resolve(sourceRoot, "cli.ts"), resolve(sourceRoot, "commands"), resolve(sourceRoot, "mcp")];

function isForbidden(file: string): boolean {
	return forbiddenRoots.some((root) => file === root || file.startsWith(`${root}${sep}`));
}

async function resolveRelativeImport(fromFile: string, specifier: string): Promise<string | null> {
	if (!specifier.startsWith(".")) return null;
	const base = resolve(dirname(fromFile), specifier);
	for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
		if ([".ts", ".tsx"].includes(extname(candidate)) && (await Bun.file(candidate).exists())) return candidate;
	}
	return null;
}

it("keeps server and web imports outside CLI, commands, and MCP", async () => {
	const entries = [resolve(sourceRoot, "server/index.ts"), ...(await collectTypeScriptFiles(resolve(sourceRoot, "web")))];
	const queue = [...entries];
	const visited = new Set<string>();
	const violations: string[] = [];

	while (queue.length > 0) {
		const file = queue.pop();
		if (!file || visited.has(file)) continue;
		visited.add(file);
		const imports = ts.preProcessFile(await readFile(file, "utf8"), true, true).importedFiles;
		for (const imported of imports) {
			const target = await resolveRelativeImport(file, imported.fileName);
			if (!target) continue;
			if (isForbidden(target)) violations.push(`${relative(sourceRoot, file)} -> ${relative(sourceRoot, target)}`);
			else queue.push(target);
		}
	}

	expect(violations).toEqual([]);
});
```

Implement `collectTypeScriptFiles` with recursive `readdir(..., { withFileTypes: true })` and include `.ts`/`.tsx` files. Normalize/sort its output so failures are stable across platforms.

- [ ] **Step 2: Run the boundary test and confirm the red state**

Run:

```text
bun test --timeout=10000 src/test/browser-dependency-boundary.test.ts
```

Expected: violations showing `server/index.ts` reaches `mcp/errors/mcp-errors.ts` and `mcp/tools/milestones/handlers.ts`.

- [ ] **Step 3: Add full-browser HTTP integration coverage**

Create `src/test/server-mini-browser-surface.test.ts` using the same server fixture pattern as `src/test/server-milestone-broadcast.test.ts:L12-L43`. Exercise a capability unavailable through mini CLI/MCP:

```ts
it("creates and archives a due-dated milestone through the full browser API", async () => {
	const createdResponse = await fetch(`${baseUrl}/api/milestones`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title: "Browser Release", dueDate: "2026-10-01" }),
	});
	expect(createdResponse.status).toBe(201);
	const created = (await createdResponse.json()) as { id: string; dueDate?: string };
	expect(created.dueDate).toBe("2026-10-01");

	const archivedResponse = await fetch(`${baseUrl}/api/milestones/${encodeURIComponent(created.id)}/archive`, {
		method: "POST",
	});
	expect(archivedResponse.status).toBe(200);

	const archived = (await (await fetch(`${baseUrl}/api/milestones/archived`)).json()) as Array<{ id: string }>;
	expect(archived.map((milestone) => milestone.id)).toContain(created.id);
});
```

Also add cases for malformed JSON (`400`, `VALIDATION_ERROR`) and a missing milestone (`404`, `NOT_FOUND`) so HTTP mapping is locked before refactoring.

- [ ] **Step 4: Run the HTTP test to establish the current behavior**

Run:

```text
bun test --timeout=10000 src/test/server-mini-browser-surface.test.ts
```

Expected: the representative full-browser test passes against the current server; error-code assertions may fail until the local HTTP error and core operation mapping are installed. This step separates behavior preservation from dependency decoupling.

- [ ] **Step 5: Replace server MCP dependencies with core operations**

Import `MilestoneOperationError` and `MilestoneOperations` from core. Add one server-local transport error:

```ts
class RequestBodyError extends Error {
	readonly code = "VALIDATION_ERROR";
}
```

Update `readOptionalJsonBody` to throw `RequestBodyError`. Update error mapping:

```ts
private milestoneMutationErrorResponse(error: unknown, context: string): Response {
	const code =
		error instanceof MilestoneOperationError || error instanceof RequestBodyError
			? error.code
			: "INTERNAL_ERROR";
	const status = code === "NOT_FOUND" ? 404 : code === "VALIDATION_ERROR" ? 400 : 500;
	const message = error instanceof Error ? error.message : context;
	if (status === 500) console.error(context, error);
	return Response.json({ error: message, code }, { status });
}
```

Create a private operations instance from `this.core` with full presentation settings. Route create/update/remove/archive through `add`, `rename`, `remove`, and `archive`. Return the milestone and message directly from `MilestoneOperationResult`; remove `getMilestoneMutationMessage` and the duplicated create-alias validation.

- [ ] **Step 6: Re-run boundary, HTTP, broadcast, and host behavior tests**

Run:

```text
bun test --timeout=10000 src/test/browser-dependency-boundary.test.ts src/test/server-mini-browser-surface.test.ts src/test/server-milestone-broadcast.test.ts src/test/server-hostname.test.ts
bun run check src/server/index.ts src/test/browser-dependency-boundary.test.ts src/test/server-mini-browser-surface.test.ts src/test/server-milestone-broadcast.test.ts
bunx tsc --noEmit
```

Expected: no forbidden imports; full browser milestone behavior, WebSocket broadcasts, loopback binding, and launch/no-launch behavior all pass.

- [ ] **Step 7: Commit the browser/server decoupling**

```text
git add src/server/index.ts src/test/browser-dependency-boundary.test.ts src/test/server-mini-browser-surface.test.ts src/test/server-milestone-broadcast.test.ts
git commit -m "BACK-688 - Decouple browser server from hidden adapters"
```

---

## Task 5: Prove the Compiled Browser Artifact and Document the Exception

**Files:**

- Modify: `src/test/mini-compiled-entry.test.ts:35-120`
- Modify: `scripts/smoke-compiled-build.ts:18-76`
- Modify: `README.md:20-50`
- Modify: `README.md:83-89`

The built binary already bundles the browser assets through the shared build, but current artifact tests explicitly reject `browser`. Completion requires launching the compiled mini binary, fetching live routes, and documenting the browser as the only full-surface exception. Source: `scripts/build.ts:L20-L38`; `src/test/mini-compiled-entry.test.ts:L35-L120`; `scripts/smoke-compiled-build.ts:L18-L76`; `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L109-L125`.

- [ ] **Step 1: Change compiled help assertions before changing smoke behavior**

Require `browser` in source-built and locally installed help:

```ts
for (const command of ["task", "search", "doc", "milestone", "mcp", "browser"]) {
	expect(stdout).toMatch(new RegExp(`^  ${command}\\b`, "m"));
}
for (const command of ["board", "init", "instructions"]) {
	expect(stdout).not.toMatch(new RegExp(`^  ${command}\\b`, "m"));
}
```

Remove `browser` from excluded compiled invocations. Update the installed-package assertion to require `browser` while continuing to reject `init` and `help`.

- [ ] **Step 2: Add a bounded compiled-browser launcher helper**

In `scripts/smoke-compiled-build.ts`, import `spawn`, add an available-port helper using `node:net`, then launch the compiled binary after the project fixture is seeded:

```ts
async function verifyBrowser(): Promise<void> {
	const port = await findAvailablePort();
	const child = spawn(executable, ["browser", "--port", String(port), "--no-open"], {
		cwd: smokeRoot,
		stdio: ["ignore", "pipe", "pipe"],
	});

	try {
		await retryUntil(async () => {
			const response = await fetch(`http://127.0.0.1:${port}/api/status`);
			assert.equal(response.ok, true);
		});
		const page = await fetch(`http://127.0.0.1:${port}/`);
		assert.equal(page.ok, true);
		assert.match(await page.text(), /<div id="root">/);
	} finally {
		child.kill("SIGTERM");
		await waitForExit(child);
	}
}
```

Use a deadline-based retry loop capped below the existing 16-second smoke timeout, capture stderr for diagnostic failure messages, and force-kill only if graceful termination misses its short deadline. Do not shell out or invoke MCP to start the browser.

- [ ] **Step 3: Update smoke exact-surface expectations**

Change the root command list to:

```ts
["browser", "doc", "mcp", "milestone", "search", "task"]
```

Remove `browser` from the rejected invocation table. Call `await verifyBrowser()` after seeding the project and before MCP startup, leaving the exact MCP tool/resource/prompt assertions unchanged. Source: `scripts/smoke-compiled-build.ts:L27-L53`; `scripts/smoke-compiled-build.ts:L77-L116`.

- [ ] **Step 4: Run compiled tests and confirm the red-to-green transition**

Before the smoke changes are complete, run:

```text
bun test --timeout=10000 src/test/mini-compiled-entry.test.ts
```

Expected red state: compiled help/smoke still disagree about browser or the live-browser assertion is absent/failing.

After implementing the launcher and expectations, rerun the same command. Expected: source-built binary, installed package, exact restricted MCP surface, and live browser checks pass.

- [ ] **Step 5: Document the browser exception**

Revise the restricted-surface introduction to say CLI and MCP are fail-closed, with the full browser as a deliberate human-facing exception. Add the command row:

```md
| `browser` | `--port`, `--no-open` |
```

Replace the statement that every other upstream command/tool is unavailable with explicit wording that browser operations may expose upstream capabilities such as due dates and archive, while those operations remain unavailable through mini CLI/MCP. Do not add explanatory subtitles beneath UI elements; this is README-only documentation. Source: `README.md:L20-L24`; `README.md:L26-L50`; `README.md:L83-L89`.

- [ ] **Step 6: Run the complete focused verification matrix**

Run:

```text
bun test --timeout=10000 src/test/mini-cli-surface.test.ts src/test/milestone-resolution.test.ts src/test/core-milestone-operations.test.ts src/test/cli-milestone-management.test.ts src/test/mcp-milestones.test.ts src/test/browser-dependency-boundary.test.ts src/test/server-mini-browser-surface.test.ts src/test/server-milestone-broadcast.test.ts src/test/server-hostname.test.ts src/test/cli-browser-port.test.ts src/test/mini-compiled-entry.test.ts
bunx tsc --noEmit
bun run check .
bun run build
bun scripts/smoke-compiled-build.ts dist/backlog.exe $(node -p "require('./package.json').version")
```

On non-Windows platforms use `dist/backlog` for the final smoke command. Expected: every focused test and static/build gate passes. Record the known unrelated full-suite baseline failures separately; do not claim the entire suite passes unless it is rerun successfully. Source: `docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L109-L119`.

- [ ] **Step 7: Audit persistence and simplify**

Run:

```text
git diff main...HEAD --stat
git ls-tree HEAD -- docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md
git ls-tree HEAD -- docs/superpowers/plans/2026-09-19-mini-browser-restoration.md
git status --short
```

Confirm every test fixture or path named by committed code exists in `HEAD`. Review the implementation for duplicated milestone aliases, duplicate error mapping, or unused adapter methods and remove them while keeping focused tests green.

- [ ] **Step 8: Commit the artifact proof and documentation**

```text
git add src/test/mini-compiled-entry.test.ts scripts/smoke-compiled-build.ts README.md
git commit -m "BACK-688 - Verify and document compiled browser"
```

---

## Finalization Checklist

- [ ] Run `backlog instructions task-finalization` before changing BACK-688 to a terminal state.
- [ ] Verify every BACK-688 acceptance criterion against the focused test/build evidence.
- [ ] Add implementation notes and the verification summary to BACK-688 through the Backlog CLI.
- [ ] Before any push, verify the PR/branch state is still open and current.
- [ ] Create or update the pull request with `Closes #5` in the PR body and the required Codex attribution line.
- [ ] Request code review and address all actionable findings before merge.
- [ ] Delete this plan only after issue #5 is closed, preserving any durable rationale in the PR or issue first.
