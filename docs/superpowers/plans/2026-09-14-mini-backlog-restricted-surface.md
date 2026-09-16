# Mini Backlog Restricted Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `mini-backlog.md` with a fail-closed CLI and MCP surface limited to approved task, document, and milestone management.

**Architecture:** Keep upstream implementations and data persistence intact, but route the shipped entry point through one immutable mini-surface policy. The policy prunes the real Commander tree before discovery or parsing, selects only approved MCP registrations and schemas, and drives positive task-output projections; a test-only full entry preserves upstream regression coverage without creating a packaged bypass.

**Tech Stack:** Bun, TypeScript 5/7, Commander 15, Model Context Protocol SDK 1.29, Bun test, Biome.

**Spec:** `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md`

## Global Constraints

- The shipped package name remains `backlog.md`, the executable remains `backlog`, and the MCP/data identities remain unchanged (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L24-L31`).
- The public CLI exposes only `--help`, `--version`, `task create|list|view|edit|complete`, root `search`, `doc create|update|list|search|view`, `milestone list|add|rename|remove`, and `mcp start` (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L33-L50`).
- Retained CLI commands use canonical long option names, never enter a wizard or TUI, and root `search` returns tasks and documents only (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L44-L50`).
- MCP advertises exactly the approved task, document, and milestone tools and no resources or prompts (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L52-L62`).
- Task schemas and results expose only the approved fields plus read-only identifiers and timestamps; unknown and future fields are hidden by positive projection (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L64-L90`).
- Due-date and archive capabilities are absent, including milestone/task output text that advertises them (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L46-L50`; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L92-L96`).
- No command, option, environment variable, configuration value, resource, alias, or packaged alternate entry point restores the full surface (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L118-L126`).
- Existing unrelated Windows test failures are baseline noise; every new or changed mini-surface test must pass, along with type checking, Biome, and the production build (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L132-L147`; BACK-687).

---

### Task 1: Encode the immutable surface policy and Commander pruning

**Files:**
- Create: `src/mini/surface-policy.ts`
- Create: `src/mini/commander-policy.ts`
- Test: `src/test/mini-commander-policy.test.ts`

**Interfaces:**
- Consumes: Commander `Command`, `Option`, and registered argument objects from `commander` 15; the upstream command graph assembled in `src/cli.ts:L982-L5892`.
- Produces: `MINI_CLI_OPTIONS`, `MINI_CLI_DESCRIPTIONS`, `MINI_MCP_TOOL_NAMES`, `MINI_TASK_*_PROPERTIES`, `MINI_TASK_SORT_FIELDS`, and `applyMiniCommanderPolicy(program: Command): void`.

- [ ] **Step 1: Write exact-set policy tests that fail before implementation**

Create a synthetic Commander graph and assert that pruning leaves only canonical commands/options, clears command and short-option aliases, makes task identifiers mandatory, and excludes a synthetic future command and option:

```ts
import { describe, expect, it } from "bun:test";
import { Command } from "commander";
import { applyMiniCommanderPolicy } from "../mini/commander-policy.ts";
import { MINI_CLI_OPTIONS } from "../mini/surface-policy.ts";

function commandPaths(command: Command, prefix = ""): string[] {
	return command.commands.flatMap((child) => {
		const path = prefix ? `${prefix} ${child.name()}` : child.name();
		return [path, ...commandPaths(child, path)];
	});
}

describe("mini Commander policy", () => {
	it("keeps the exact allowlisted graph and rejects future additions by default", () => {
		const program = new Command().name("backlog").version("1.0.0", "-v, --version");
		program.command("task").alias("tasks").command("create [title]").option("-d, --description <text>").option("--future");
		program.commands.find((command) => command.name() === "task")?.command("archive <id>");
		program.command("future-command");

		applyMiniCommanderPolicy(program);

		expect(commandPaths(program)).toEqual(["task", "task create"]);
		const create = program.commands[0]?.commands[0];
		expect(create?.aliases()).toEqual([]);
		expect(create?.options.map((option) => option.long)).toEqual(["--description"]);
		expect(create?.options[0]?.short).toBeUndefined();
		expect(create?.registeredArguments[0]?.required).toBe(true);
		expect(Object.isFrozen(MINI_CLI_OPTIONS)).toBe(true);
		expect(Object.values(MINI_CLI_OPTIONS).every(Object.isFrozen)).toBe(true);
	});
});
```

- [ ] **Step 2: Run the policy test and verify it fails**

Run:

```bash
bun test --timeout=10000 src/test/mini-commander-policy.test.ts
```

Expected: FAIL because `src/mini/commander-policy.ts` and the policy constants do not exist.

- [ ] **Step 3: Implement the immutable contract constants**

In `src/mini/surface-policy.ts`, freeze exact positive allowlists, including every nested array. Use these property names and no catch-all entries:

```ts
function freezeStringLists<const T extends Record<string, readonly string[]>>(value: T): Readonly<T> {
	for (const list of Object.values(value)) Object.freeze(list);
	return Object.freeze(value);
}

export const MINI_CLI_OPTIONS = freezeStringLists({
	"": ["--version"],
	task: [],
	"task create": ["--description", "--assignee", "--status", "--labels", "--priority", "--type", "--milestone", "--depends-on", "--ac", "--acceptance-criteria", "--plain"],
	"task list": ["--status", "--exclude-status", "--assignee", "--unassigned", "--milestone", "--priority", "--type", "--labels", "--search", "--ready", "--limit", "--sort", "--plain", "--json", "--watch"],
	search: ["--type", "--task-type", "--status", "--exclude-status", "--priority", "--limit", "--plain", "--json"],
	"task view": ["--plain", "--json"],
	"task edit": ["--title", "--description", "--assignee", "--status", "--label", "--priority", "--type", "--milestone", "--clear-milestone", "--plain", "--add-label", "--remove-label", "--clear-labels", "--ac", "--remove-ac", "--check-ac", "--uncheck-ac", "--acceptance-criteria", "--clear-ac", "--comment", "--comment-author", "--clear-deps", "--depends-on"],
	"task complete": [],
	doc: [],
	"doc create": ["--path", "--type", "--plain"],
	"doc update": ["--title", "--content", "--path", "--type", "--tags"],
	"doc list": ["--plain"],
	"doc search": ["--limit"],
	"doc view": ["--plain"],
	milestone: [],
	"milestone list": ["--show-completed", "--plain"],
	"milestone add": ["--description"],
	"milestone rename": ["--no-update-tasks"],
	"milestone remove": ["--task-handling", "--reassign-to"],
	mcp: [],
	"mcp start": ["--debug", "--cwd"],
} as const);

export const MINI_CLI_DESCRIPTIONS = Object.freeze({
	"": "mini-backlog.md - restricted task, document, and milestone management",
	task: "manage tasks",
	"task create": "create a task",
	"task list": "list tasks",
	search: "search tasks and documents",
	"task view": "view a task",
	"task edit": "edit a task",
	"task complete": "move a terminal-status task to completed",
	doc: "manage documents",
	"doc create": "create a document",
	"doc update": "update a document",
	"doc list": "list documents",
	"doc search": "search documents",
	"doc view": "view a document",
	milestone: "manage milestones",
	"milestone list": "list milestones",
	"milestone add": "add a milestone",
	"milestone rename": "rename a milestone",
	"milestone remove": "remove a milestone",
	mcp: "manage the MCP server",
	"mcp start": "start the restricted MCP server",
} as const);

export const MINI_MCP_TOOL_NAMES = Object.freeze([
	"task_create", "task_list", "task_search", "task_view", "task_edit", "task_complete",
	"document_list", "document_search", "document_view", "document_create", "document_update",
	"milestone_list", "milestone_add", "milestone_rename", "milestone_remove",
] as const);

export const MINI_TASK_CREATE_PROPERTIES = Object.freeze([
	"title", "description", "status", "priority", "type", "milestone", "labels", "assignee", "dependencies", "acceptanceCriteria",
] as const);
export const MINI_TASK_LIST_PROPERTIES = Object.freeze([
	"status", "type", "assignee", "unassigned", "milestone", "labels", "search", "ready", "limit",
] as const);
export const MINI_TASK_SEARCH_PROPERTIES = Object.freeze(["query", "status", "type", "priority", "limit"] as const);
export const MINI_TASK_EDIT_PROPERTIES = Object.freeze([
	"id", "title", "description", "status", "priority", "type", "milestone", "labels", "assignee", "dependencies",
	"commentsAppend", "commentAuthor", "acceptanceCriteriaSet", "acceptanceCriteriaAdd", "acceptanceCriteriaRemove",
	"acceptanceCriteriaCheck", "acceptanceCriteriaUncheck",
] as const);
export const MINI_TASK_SUMMARY_FIELDS = Object.freeze([
	"id", "title", "status", "type", "priority", "assignees", "labels", "milestone",
	"acceptanceCriteriaCompleted", "acceptanceCriteriaCount", "createdAt", "updatedAt",
] as const);
export const MINI_TASK_DETAIL_FIELDS = Object.freeze([
	...MINI_TASK_SUMMARY_FIELDS, "description", "dependencies", "acceptanceCriteria", "comments",
] as const);
export const MINI_TASK_SORT_FIELDS = Object.freeze(["priority", "id"] as const);
```

`--help` is Commander's long-only implicit help option and is deliberately not duplicated in each policy entry.

- [ ] **Step 4: Implement fail-closed Commander pruning**

In `src/mini/commander-policy.ts`, recurse over `program.commands`, retain only paths present in `MINI_CLI_OPTIONS`, remove unlisted options in place, clear aliases, clear each retained option's `short`, discard upstream custom help listeners, replace descriptions from `MINI_CLI_DESCRIPTIONS`, and configure long-only `--help`. Clearing `beforeHelp`, `afterHelp`, `beforeAllHelp`, and `afterAllHelp` prevents `addHelpSchema` callbacks from disclosing excluded fields. Mark `task create`'s title and `task edit`'s variadic task IDs required:

```ts
export function applyMiniCommanderPolicy(program: Command): void {
	pruneChildren(program, "");
	for (const command of walkCommands(program)) {
		const path = commandPath(command);
		const allowed = new Set(MINI_CLI_OPTIONS[path as keyof typeof MINI_CLI_OPTIONS] ?? []);
		command.commands.splice(0, command.commands.length, ...command.commands.filter((child) => hasAllowedPath(path, child.name())));
		command.options.splice(0, command.options.length, ...command.options.filter((option) => option.long && allowed.has(option.long)));
		command.aliases([]);
		for (const event of ["beforeHelp", "afterHelp", "beforeAllHelp", "afterAllHelp"]) command.removeAllListeners(event);
		command.description(MINI_CLI_DESCRIPTIONS[path as keyof typeof MINI_CLI_DESCRIPTIONS]);
		command.helpOption("--help", "display help for command");
		for (const option of command.options) option.short = undefined;
	}
	requireArgument(findCommand(program, "task create"), 0);
	requireArgument(findCommand(program, "task edit"), 0);
}
```

Keep `walkCommands`, `commandPath`, `hasAllowedPath`, `findCommand`, and `requireArgument` private so the policy exposes one mutation entry point.

- [ ] **Step 5: Run the policy tests and type-check the new interfaces**

Run:

```bash
bun test --timeout=10000 src/test/mini-commander-policy.test.ts
bunx tsc --noEmit
```

Expected: PASS; TypeScript confirms Commander properties are mutated through supported writable arrays/properties. If Commander types mark a collection readonly, mutate the existing array with `splice` rather than assigning a replacement.

- [ ] **Step 6: Commit the policy slice**

```bash
git add src/mini/surface-policy.ts src/mini/commander-policy.ts src/test/mini-commander-policy.test.ts
git commit -m "BACK-687 - Add fail-closed surface policy"
```

---

### Task 2: Make the shipped CLI use the mini policy without breaking upstream internal tests

**Files:**
- Create: `src/mini/runtime.ts`
- Create: `src/test/full-cli-entry.ts`
- Create: `src/test/mini-cli-surface.test.ts`
- Modify: `src/cli.ts:848-988,1855-2284,2524-3014,3538-3827,4270-4859,5881-5900`
- Modify: `src/test/test-cli.ts:1-5`
- Modify: `src/test/cli-doc-decision-board.test.ts`
- Modify: `src/test/cli-json-output.test.ts`
- Modify: `src/test/code-path.test.ts`
- Modify: `src/test/task-wizard.test.ts`

**Interfaces:**
- Consumes: `applyMiniCommanderPolicy(program)`, `MINI_TASK_SORT_FIELDS`, and current CLI command actions.
- Produces: `type SurfaceMode = "mini" | "full"`, `getActiveSurfaceMode(): SurfaceMode`, and `runCli(argv?: string[], surface?: SurfaceMode): Promise<void>`. The production default is always `mini`; only `src/test/full-cli-entry.ts` calls `runCli(..., "full")`.

- [ ] **Step 1: Write failing public-entry CLI tests**

Create `src/test/mini-cli-surface.test.ts` using the actual shipped source entry, not `getTestCliPath()`:

```ts
const MINI_CLI_PATH = join(process.cwd(), "src", "cli.ts");

it("publishes only the exact root commands", async () => {
	const result = await $`bun ${MINI_CLI_PATH} --help`.quiet().nothrow();
	const output = result.stdout.toString();
	expect(result.exitCode).toBe(0);
	for (const allowed of ["task", "search", "doc", "milestone", "mcp"]) expect(output).toContain(allowed);
	for (const hidden of ["init", "draft", "board", "decision", "agents", "config", "doctor", "cleanup", "browser", "overview", "completion", "instructions"]) expect(output).not.toMatch(new RegExp(`\\b${hidden}\\b`));
});

it.each(["init", "task archive TASK-1", "milestone archive m-1", "task create X --due-date 2026-09-14", "task edit TASK-1 --project Web", "tasks list", "task 1"])("rejects excluded invocation: %s", async (args) => {
	const result = await $`bun ${[MINI_CLI_PATH, ...args.split(" ")]}`.quiet().nothrow();
	expect(result.exitCode).not.toBe(0);
	expect(result.stderr.toString()).not.toContain("Definition of Done");
});
```

Add tests that bare invocation prints restricted Commander help, `task create` without a title and `task edit` without IDs fail noninteractively, `search --type decision` fails validation, `task list --sort ordinal` fails, and allowed help contains long options but no `-a`, `-d`, `--desc`, or `--dep`. Exact help assertions must also reject `due-date`, `project`, `Definition of Done`, `implementation`, `decision`, and archive guidance so custom `addHelpSchema` text cannot leak excluded concepts.

- [ ] **Step 2: Run the mini CLI tests and verify they fail**

```bash
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
```

Expected: FAIL because the current public entry exposes the full command graph and root entry.

- [ ] **Step 3: Introduce an internal surface mode and exported runner**

Implement `src/mini/runtime.ts` as process-local state with a mini default and no environment/config parsing:

```ts
export type SurfaceMode = "mini" | "full";

let activeSurfaceMode: SurfaceMode = "mini";

export function setActiveSurfaceMode(mode: SurfaceMode): void {
	activeSurfaceMode = mode;
}

export function getActiveSurfaceMode(): SurfaceMode {
	return activeSurfaceMode;
}
```

Refactor the bottom of `src/cli.ts` so parsing is explicit and production always selects mini:

```ts
export async function runCli(argv: string[] = process.argv, surface: SurfaceMode = "mini"): Promise<void> {
	setActiveSurfaceMode(surface);
	if (surface === "mini") applyMiniCommanderPolicy(program);
	if (await handleBareInvocation(argv, surface, program, version)) return;
	await program.parseAsync(argv);
}

if (import.meta.main) {
	await runCli(process.argv, "mini");
}
```

Move current bare-root handling into `handleBareInvocation`; mini calls `program.outputHelp()` and returns, while full retains `printRootEntry`. Keep migration behavior inside `runCli` so import alone has no command side effects.

- [ ] **Step 4: Force retained mini commands down noninteractive branches**

Make existing helpers consult `getActiveSurfaceMode()`:

```ts
function canUseInteractiveUi(): boolean {
	return getActiveSurfaceMode() === "full" && hasInteractiveTTY;
}

function isPlainRequested(options?: { plain?: boolean }): boolean {
	return getActiveSurfaceMode() === "mini" || Boolean(options?.plain || plainFlagInArgv);
}
```

Use `canUseInteractiveUi()` in create/edit wizard selection and pass it to `resolveReadOutputMode`. Restrict root search types to `task | document` in mini mode, validate `--type decision` as an error instead of silently ignoring it, and validate mini sorting against `MINI_TASK_SORT_FIELDS`. The policy removes project, modified-file, parent, due-date, plan, notes, DoD, final-summary, archive, and alias options before parsing.

- [ ] **Step 5: Preserve full upstream CLI tests through an unshipped test entry**

Create `src/test/full-cli-entry.ts`:

```ts
import { runCli } from "../cli.ts";

await runCli(process.argv, "full");
```

Change `getTestCliPath()` to return that file by default, and replace the four literal executable references in the listed upstream tests with `getTestCliPath()`. The production build and package scripts continue pointing at `src/cli.ts`, and `package.json.files` does not publish `src/test`, so this harness is not a packaged alternate entry (`package.json:L5-L13`; `scripts/build.ts:L20-L26`).

- [ ] **Step 6: Run mini and representative full CLI tests**

```bash
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
bun test --timeout=10000 src/test/cli-root-entry.test.ts src/test/cli-task-wizard.test.ts src/test/cli-doc-decision-board.test.ts
bunx tsc --noEmit
```

Expected: PASS. The mini entry is restricted; the test-only entry keeps existing upstream behavior covered.

- [ ] **Step 7: Commit the shipped CLI slice**

```bash
git add src/mini/runtime.ts src/cli.ts src/test/full-cli-entry.ts src/test/test-cli.ts src/test/mini-cli-surface.test.ts src/test/cli-doc-decision-board.test.ts src/test/cli-json-output.test.ts src/test/code-path.test.ts src/test/task-wizard.test.ts
git commit -m "BACK-687 - Restrict the shipped CLI surface"
```

---

### Task 3: Enforce the task field contract in schemas, outputs, and edits

**Files:**
- Create: `src/mini/task-output.ts`
- Create: `src/test/mini-task-contract.test.ts`
- Modify: `src/formatters/task-plain-text.ts:85-235`
- Modify: `src/formatters/json-output.ts:16-195,219-263`
- Modify: `src/mcp/utils/schema-generators.ts:74-568`
- Modify: `src/mcp/utils/task-response.ts:1-23`
- Modify: `src/mcp/tools/tasks/index.ts:15-118`
- Modify: `src/mcp/tools/tasks/handlers.ts:78-571`
- Modify: `src/cli.ts:317-330,2055-2058,2267-2284,2524-3014,3490-3515,3814-3822`

**Interfaces:**
- Consumes: the task property allowlists from `src/mini/surface-policy.ts`, existing `Task`, `TaskDetail`, `TaskListItem`, and `JsonSchema` types.
- Produces: `pickSchemaProperties(schema: JsonSchema, names: readonly string[]): JsonSchema`, `formatMiniTaskSummaryLine(task: Task, options?): string`, `formatMiniTaskPlainText(task: TaskDetail): string`, `toMiniTaskSummaryJson(task: TaskListItem): MiniTaskSummaryJson`, and `toMiniTaskDetailsJson(task: TaskDetail): MiniTaskDetailsJson`.

- [ ] **Step 1: Write failing exact schema and positive-projection tests**

In `src/test/mini-task-contract.test.ts`, assert exact keys rather than containment:

```ts
expect(Object.keys(generateMiniTaskCreateSchema(config).properties ?? {}).sort()).toEqual([...MINI_TASK_CREATE_PROPERTIES].sort());
expect(Object.keys(generateMiniTaskEditSchema(config).properties ?? {}).sort()).toEqual([...MINI_TASK_EDIT_PROPERTIES].sort());
expect(generateMiniTaskEditSchema(config).additionalProperties).toBe(false);

const leakedTask = {
	...taskDetailFixture(),
	project: "Secret",
	dueDate: "2026-09-14",
	implementationPlan: "hidden plan",
	definitionOfDoneItems: [{ index: 1, text: "hidden DoD", checked: false }],
	futureUpstreamField: "must stay hidden",
} as TaskDetail & { futureUpstreamField: string };

const json = toMiniTaskDetailsJson(leakedTask);
expect(Object.keys(json).sort()).toEqual([...MINI_TASK_DETAIL_FIELDS].sort());
expect(formatMiniTaskPlainText(leakedTask)).not.toMatch(/Secret|hidden plan|hidden DoD|futureUpstreamField|Due:|File:|Ordinal:|Parent:/);
```

Also validate that mini create/edit/list/search schemas reject `dueDate`, `project`, `modifiedFiles`, `planSet`, `definitionOfDoneAdd`, and a synthetic `futureUpstreamField` through `createSimpleValidatedTool` before a handler spy is called.

- [ ] **Step 2: Run the task-contract tests and verify they fail**

```bash
bun test --timeout=10000 src/test/mini-task-contract.test.ts
```

Expected: FAIL because mini schemas and task projections do not exist.

- [ ] **Step 3: Add schema projection with fail-closed required-field handling**

Implement schema projection without mutating upstream schemas:

```ts
export function pickSchemaProperties(schema: JsonSchema, names: readonly string[]): JsonSchema {
	const allowed = new Set(names);
	return {
		...schema,
		properties: Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([name]) => allowed.has(name))),
		required: (schema.required ?? []).filter((name) => allowed.has(name)),
		additionalProperties: false,
	};
}

export const generateMiniTaskCreateSchema = (config: BacklogConfig) =>
	pickSchemaProperties(generateTaskCreateSchema(config), MINI_TASK_CREATE_PROPERTIES);
```

Add equivalent mini functions for list, search, and edit. Keep dynamic upstream status/priority/type enums by projecting the generated schemas rather than duplicating validation rules (`src/mcp/utils/schema-generators.ts:L74-L568`).

- [ ] **Step 4: Build task outputs through positive construction**

In `src/mini/task-output.ts`, construct each output object property explicitly. Summary objects contain `id`, `title`, `status`, `type`, `priority`, `assignees`, `labels`, `milestone`, acceptance-criteria counts, `createdAt`, and `updatedAt`. Detail objects add `description`, direct `dependencies`, full `acceptanceCriteria`, and `comments`. Do not spread `Task` or `TaskDetail` values:

```ts
export function toMiniTaskDetailsJson(task: TaskDetail): MiniTaskDetailsJson {
	return {
		...toMiniTaskSummaryJson(task),
		description: nullableDescription(task.description),
		dependencies: [...(task.dependencies ?? [])],
		acceptanceCriteria: toChecklistJson(task.acceptanceCriteriaItems),
		comments: toCommentJson(task.comments),
	};
}
```

Build mini plain text from the same approved concepts: ID/title, status, priority, type, assignees, created/updated timestamps, labels, milestone, direct dependencies, description, acceptance criteria, and comments. Do not call the full formatter and redact strings afterward.

- [ ] **Step 5: Route mini CLI and MCP task responses through the projections**

Add an optional `surface: SurfaceMode = "full"` parameter to existing formatter entry points and `TaskHandlers`. In mini mode use `formatMiniTaskPlainText`, `formatMiniTaskSummaryLine`, `toMiniTaskSummaryJson`, and `toMiniTaskDetailsJson`; full test mode retains upstream output. Remove decisions from mini `searchJson` input/output and ensure mini search filters task/document results before formatting.

Register mini task tools with projected schemas and omit `task_archive`:

```ts
export function registerTaskTools(server: McpServer, config: BacklogConfig, surface: SurfaceMode = "full"): void {
	const schemas = surface === "mini" ? createMiniTaskSchemas(config) : createFullTaskSchemas(config);
	const handlers = new TaskHandlers(server, surface);
	// add create/list/search/edit/view/complete in both modes
	if (surface === "full") server.addTool(archiveTaskTool);
}
```

Update tool descriptions so mini mode names only approved fields.

- [ ] **Step 6: Add an integration regression for hidden metadata preservation**

Seed a task file containing `project`, `due_date`, references, documentation, ordinal, parent, DoD, plan, notes, modified files, final summary, and a synthetic YAML field. Invoke the public mini entry with an allowed edit:

```ts
const before = await Bun.file(taskPath).text();
const result = await $`bun ${MINI_CLI_PATH} task edit TASK-1 --description Changed --plain`.cwd(TEST_DIR).quiet().nothrow();
expect(result.exitCode).toBe(0);
const after = await Bun.file(taskPath).text();
for (const hiddenValue of ["Secret", "2026-09-14", "hidden plan", "hidden notes", "future-value"]) {
	expect(after).toContain(hiddenValue);
}
expect(after).toContain("Changed");
expect(result.stdout.toString()).not.toMatch(/Secret|2026-09-14|hidden plan|hidden notes|future-value/);
```

This verifies preservation at the public boundary while leaving core parsing and persistence unchanged (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L82-L90`).

- [ ] **Step 7: Run focused task-contract and existing preservation tests**

```bash
bun test --timeout=10000 src/test/mini-task-contract.test.ts src/test/task-edit-preservation.test.ts src/test/mcp-tasks.test.ts src/test/cli-json-output.test.ts
bunx tsc --noEmit
```

Expected: PASS. Mini output is positive-projected, mini schemas reject extras, and full internal regression tests retain their prior expectations.

- [ ] **Step 8: Commit the task contract slice**

```bash
git add src/mini/task-output.ts src/test/mini-task-contract.test.ts src/formatters/task-plain-text.ts src/formatters/json-output.ts src/mcp/utils/schema-generators.ts src/mcp/utils/task-response.ts src/mcp/tools/tasks/index.ts src/mcp/tools/tasks/handlers.ts src/cli.ts
git commit -m "BACK-687 - Restrict task fields and output"
```

---

### Task 4: Restrict MCP registration and milestone exposure

**Files:**
- Create: `src/test/mini-mcp-surface.test.ts`
- Modify: `src/commands/mcp.ts:24-45`
- Modify: `src/mcp/server.ts:27-33,54-56,231-301,511-565`
- Modify: `src/mcp/tools/milestones/index.ts:14-76`
- Modify: `src/mcp/tools/milestones/schemas.ts:3-101`
- Modify: `src/mcp/tools/milestones/handlers.ts:268-430`
- Modify: `src/cli.ts:4270-4452`

**Interfaces:**
- Consumes: `SurfaceMode`, `getActiveSurfaceMode()`, `MINI_MCP_TOOL_NAMES`, restricted task registrars/schemas, existing document registrars, and existing milestone handlers.
- Produces: `ServerInitOptions.surface?: SurfaceMode` and one private `registerProjectSurface(server: McpServer, config: BacklogConfig, surface: SurfaceMode): void` used by normal startup and roots-based upgrade.

- [ ] **Step 1: Write failing exact MCP discovery tests**

Bootstrap an initialized project with `createMcpServer(TEST_DIR, { surface: "mini" })` and assert exact ordered sets:

```ts
const tools = await server.testInterface.listTools();
expect(tools.tools.map((tool) => tool.name).sort()).toEqual([...MINI_MCP_TOOL_NAMES].sort());
expect((await server.testInterface.listResources()).resources).toEqual([]);
expect((await server.testInterface.listResourceTemplates()).resourceTemplates).toEqual([]);
expect((await server.testInterface.listPrompts()).prompts).toEqual([]);

await expect(server.testInterface.callTool({ params: { name: "task_archive", arguments: { id: "TASK-1" } } })).rejects.toThrow("Tool not found");
await expect(server.testInterface.callTool({ params: { name: "get_backlog_instructions", arguments: {} } })).rejects.toThrow("Tool not found");
```

Add a fallback/roots-upgrade test: uninitialized mini starts with empty tools/resources, upgrades after a valid client root, and then advertises exactly `MINI_MCP_TOOL_NAMES`. This covers both current registration sites (`src/mcp/server.ts:L261-L276`; `src/mcp/server.ts:L518-L550`).

- [ ] **Step 2: Run the MCP surface test and verify it fails**

```bash
bun test --timeout=10000 src/test/mini-mcp-surface.test.ts
```

Expected: FAIL because the current factory registers workflow, DoD, archive, and initialization surfaces.

- [ ] **Step 3: Centralize surface-aware server registration**

Extend internal server options and use one registrar at both normal startup and roots upgrade:

```ts
type ServerInitOptions = {
	debug?: boolean;
	pinned?: boolean;
	surface?: SurfaceMode;
};

function registerProjectSurface(server: McpServer, config: BacklogConfig, surface: SurfaceMode): void {
	if (surface === "full") {
		registerWorkflowResources(server);
		registerWorkflowTools(server);
		registerDefinitionOfDoneTools(server);
	}
	registerTaskTools(server, config, surface);
	registerMilestoneTools(server, surface);
	registerDocumentTools(server, config);
}
```

Store the selected mode on `McpServer` so roots upgrades use the same value. In mini fallback/downgrade mode register nothing; keep roots discovery active so a valid project can upgrade. Use mini server instructions that describe task/document/milestone tools directly and do not instruct clients to list or read resources.

Change `src/commands/mcp.ts` to pass the internal active surface into the server factory:

```ts
const server = await createMcpServer(projectRoot, {
	debug: options.debug,
	pinned,
	surface: getActiveSurfaceMode(),
});
```

Do not add a CLI option or environment variable for `surface`.

- [ ] **Step 4: Remove milestone archive and due-date schema/output from mini mode**

Make `registerMilestoneTools(server, surface = "full")` omit `milestone_archive` for mini. Add mini schemas by positive projection:

```ts
export const miniMilestoneAddSchema = pickSchemaProperties(milestoneAddSchema, ["name", "description"]);
export const miniMilestoneRenameSchema = pickSchemaProperties(milestoneRenameSchema, ["from", "to", "updateTasks"]);
```

The remove and list schemas already contain only approved properties. Pass surface into `MilestoneHandlers`; mini list output includes each active milestone's ID, title, and description, while list/add/rename output omits due dates, archived-value sections, and the `milestone_archive` hint. Update CLI milestone list to include active descriptions but omit due dates in mini mode; Commander pruning already removes due-date and archive inputs.

- [ ] **Step 5: Verify document tools remain complete and milestone fields are exact**

In the MCP test, exact-set compare each document and milestone schema:

```ts
expect(keysByTool.document_create).toEqual(["content", "path", "tags", "title", "type"]);
expect(keysByTool.document_update).toEqual(["content", "id", "path", "tags", "title", "type"]);
expect(keysByTool.milestone_add).toEqual(["description", "name"]);
expect(keysByTool.milestone_rename).toEqual(["from", "to", "updateTasks"]);
expect(keysByTool.milestone_remove).toEqual(["name", "reassignTo", "taskHandling"]);
```

Use the actual current document schema names if their existing stable ID field differs; preserve all existing document fields and change no document persistence behavior (`src/mcp/tools/documents/index.ts:L21-L85`; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L92-L96`).

- [ ] **Step 6: Run mini MCP plus representative full MCP tests**

```bash
bun test --timeout=10000 src/test/mini-mcp-surface.test.ts src/test/mcp-server.test.ts src/test/mcp-roots-discovery.test.ts src/test/mcp-milestones.test.ts src/test/mcp-documents.test.ts
bunx tsc --noEmit
```

Expected: PASS. Mini discovery is exact and empty of resources; full internal tests still exercise upstream registrations.

- [ ] **Step 7: Commit the MCP and milestone slice**

```bash
git add src/test/mini-mcp-surface.test.ts src/commands/mcp.ts src/mcp/server.ts src/mcp/tools/milestones/index.ts src/mcp/tools/milestones/schemas.ts src/mcp/tools/milestones/handlers.ts src/cli.ts
git commit -m "BACK-687 - Restrict MCP and milestone surfaces"
```

---

### Task 5: Identify the fork, document the contract, and verify the shipped binary

**Files:**
- Modify: `README.md`
- Modify: `package.json:77-85`
- Create: `src/test/mini-package-contract.test.ts`
- Modify through Backlog CLI: `backlog/tasks/back-687 - Create-fail-closed-restricted-CLI-and-MCP-surface.md`

**Interfaces:**
- Consumes: the final exact policy constants and production build entry in `scripts/build.ts`.
- Produces: user-facing fork documentation and package repository metadata pointing to `glitchwerks/mini-backlog.md`; package/executable names stay unchanged.

- [ ] **Step 1: Write a failing package/readme contract test**

```ts
import { expect, it } from "bun:test";

it("identifies mini-backlog without renaming the executable contract", async () => {
	const pkg = await Bun.file("package.json").json();
	const readme = await Bun.file("README.md").text();
	expect(pkg.name).toBe("backlog.md");
	expect(pkg.bin).toEqual({ backlog: "scripts/cli.cjs" });
	expect(pkg.repository.url).toBe("git+https://github.com/glitchwerks/mini-backlog.md.git");
	expect(readme).toContain("mini-backlog.md");
	expect(readme).toContain("Restricted surface");
});
```

- [ ] **Step 2: Run the package contract test and verify it fails**

```bash
bun test --timeout=10000 src/test/mini-package-contract.test.ts
```

Expected: FAIL because package metadata and README still identify only upstream Backlog.md.

- [ ] **Step 3: Update repository identity and README**

Set `package.json.repository.url` to `git+https://github.com/glitchwerks/mini-backlog.md.git` and `bugs.url` to `https://github.com/glitchwerks/mini-backlog.md/issues`. Keep `name`, `bin`, optional platform package names, and executable naming unchanged.

Add a concise README lead identifying this as the restricted fork, followed by an exact CLI/MCP table sourced from `MINI_CLI_OPTIONS` and `MINI_MCP_TOOL_NAMES`. State that excluded operations are absent from discovery and invocation, there is no full-surface switch, and upstream synchronization is maintained through `MrLesk/Backlog.md` (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L149-L157`).

- [ ] **Step 4: Run all scoped verification**

```bash
bun test --timeout=10000 src/test/mini-commander-policy.test.ts src/test/mini-cli-surface.test.ts src/test/mini-task-contract.test.ts src/test/mini-mcp-surface.test.ts src/test/mini-package-contract.test.ts
bunx tsc --noEmit
bun run check .
bun run build
```

Expected: every command exits 0. Run the built Windows artifact's `--help` and excluded-command smoke checks using the path emitted by `bun run build`; assert allowed groups appear and `board`, `task archive`, and `milestone archive` fail.

- [ ] **Step 5: Attempt the full suite and distinguish only pre-existing baseline failures**

```bash
bun run test
```

Expected on this Windows host: the previously recorded upstream failures may recur in agent instructions, board TUI movement, Claude symlink handling, or browser cleanup. No mini-surface test or newly affected upstream test may fail. Record exact passing/failing counts and test names in BACK-687 implementation notes.

- [ ] **Step 6: Commit documentation and repository identity**

```bash
git add README.md package.json src/test/mini-package-contract.test.ts
git commit -m "BACK-687 - Document mini-backlog surface"
```

- [ ] **Step 7: Run the task finalization workflow before claiming completion**

```bash
bun run cli instructions task-finalization
```

Use the guide to verify each acceptance criterion with command output, update BACK-687 through `bun run cli task edit`, and record the final summary. Do not edit the task markdown directly.

- [ ] **Step 8: Audit artifact persistence and prepare review**

```bash
git diff mini/main...HEAD --stat
git ls-tree HEAD -- docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md
git ls-tree HEAD -- docs/superpowers/plans/2026-09-14-mini-backlog-restricted-surface.md
git status --short
```

Expected: the diff contains every code, test, README, task, spec, and plan artifact claimed; both referenced planning files exist in `HEAD`; the worktree is clean. Before any push, verify the branch's PR state as required by `AGENTS.md`.
