# Mini Backlog Restricted Surface Design

**Date:** 2026-09-14

**Status:** Approved for implementation planning

**Tracking:** GitHub issue #1; Backlog task BACK-687

## Context

`mini-backlog.md` is a deliberately narrower fork of Backlog.md. Its purpose is to reduce the callable CLI and MCP surface placed in an agent's context, so callers do not need prompt instructions forbidding unrelated commands. The reduction is about discoverability and callability, not executable file size. Hidden operations may remain compiled into the binary, but they must not appear in help, schemas, completion data, or MCP discovery and must not be invocable through those public entry points. This is the accepted scope of #1.

This fork intentionally diverges from upstream's surface hierarchy. Upstream defines the CLI as its canonical and complete interface and MCP as a compatibility adapter (`MANIFESTO.md:L55-L66`), while this product needs both interfaces to expose the same restricted subset (#1). The distinct `glitchwerks/mini-backlog.md` repository identity makes that product distinction explicit; the package, executable, MCP identity, data model, and internal implementation remain upstream-compatible (#1).

The design preserves upstream's Markdown source of truth and semantic command boundary (`MANIFESTO.md:L43-L53`). It also follows the manifesto's fail-closed identity and simplicity principles (`MANIFESTO.md:L84-L93`) while accepting a deliberate public-surface divergence recorded above.

## Goals

- Expose only the approved task, document, and milestone operations, plus essential process plumbing (#1).
- Make excluded operations genuinely absent rather than visible-but-disabled (#1).
- Limit task inputs and outputs to an explicit field allowlist and preserve excluded metadata already stored in task files (#1).
- Keep the CLI and MCP projections consistent from one immutable policy (#1; `MANIFESTO.md:L89-L93`).
- Detect upstream surface growth with exact contract tests before it can become public (#1; `MANIFESTO.md:L111-L115`).
- Keep periodic upstream synchronization straightforward through the fork's `upstream` remote. GitHub documents this remote-based fork update model ([Configuring a remote repository for a fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/configuring-a-remote-repository-for-a-fork), fetched 2026-09-14).

## Non-goals

- Reducing bundle size or removing every excluded implementation from source (#1).
- Renaming the npm package, `backlog` executable, MCP server identity, or on-disk Backlog format (#1).
- Providing a runtime flag, environment variable, alternate executable, or undocumented route back to the full upstream surface (#1).
- Changing core parsing, persistence, locking, task allocation, or Git behavior except where an allowed command must constrain its public inputs or outputs (#1; `MANIFESTO.md:L43-L53`).

## Public Contract

### CLI

The root program exposes only:

| Group | Callable operations |
| --- | --- |
| Process plumbing | `--help`, `--version`, `mcp start` |
| Task | `task create`, `task list`, `search`, `task view`, `task edit`, `task complete` |
| Document | `doc list`, `doc search`, `doc view`, `doc create`, `doc update` |
| Milestone | `milestone list`, `milestone add`, `milestone rename`, `milestone remove` |

No convenience alias, task-ID shorthand, interactive root behavior, or command outside this table is public (#1). Invoking an excluded or unknown command returns Commander's normal non-zero unknown-command error. Root help, nested help, shell-completion extraction, and parse-time lookup all see the same restricted command tree (#1). The current CLI registers many additional groups before `parseAsync` (`src/cli.ts:L1839-L5892`) and handles a bare invocation before Commander parsing (`src/cli.ts:L878-L923`); both paths must be constrained before they can disclose or invoke excluded behavior.

Retained commands are noninteractive: reads default to restricted plain text and may offer restricted JSON where upstream already supports it. `task create` requires a title and `task edit` requires at least one task ID, so neither can enter an interactive wizard. `search` returns only task and document results. Options use their canonical long forms without short or legacy aliases. These rules prevent an allowed command from becoming a route into excluded TUI actions or fields (#1; `src/cli.ts:L1855-L2058`; `src/cli.ts:L2075-L2284`; `src/cli.ts:L2891-L3014`; `src/cli.ts:L3538-L3780`).

`task complete` remains available as the explicit task terminal transition. Archive is absent for every entity, and due-date operations are absent (#1).

### MCP

MCP registers only the operations in the same table, using the existing tool-name convention:

- `task_create`, `task_list`, `task_search`, `task_view`, `task_edit`, `task_complete`
- `document_list`, `document_search`, `document_view`, `document_create`, `document_update`
- `milestone_list`, `milestone_add`, `milestone_rename`, `milestone_remove`

No workflow, Definition of Done, initialization, archive, decision, board, configuration, browser, cleanup, overview, or instruction tool/resource is registered (#1). A direct call to an excluded name receives the MCP SDK's normal tool-not-found response. The current server registers workflow resources/tools, tasks, milestones, Definition of Done, and documents in both its root-upgrade and normal factory paths (`src/mcp/server.ts:L266-L271`; `src/mcp/server.ts:L545-L550`); both paths must use the restricted policy.

The upstream initialization resource is never registered. If the runtime cannot resolve an initialized Backlog project, that condition is reported as a concise startup or operation error without advertising an initialization capability. This follows the strict no-resource/no-init contract in #1.

## Task Field Contract

Task reads and writes expose only:

- `title`
- `description`
- `status`
- `priority`
- `type`
- `milestone`
- `labels`
- `assignee`
- `dependencies`
- `acceptanceCriteria`
- `comments`

Stable task identifiers and timestamps may be returned as read-only metadata. They are never accepted as caller-controlled values (#1).

Known excluded fields include due date, project, implementation plan, implementation notes, Definition of Done, references, documentation, modified files, ordinal, hierarchy/parent, final summary, source branch, file path, and raw content (#1). Any field added by upstream is excluded by default until it is deliberately added to this allowlist. The current upstream task schemas include several excluded fields (`src/mcp/utils/schema-generators.ts:L164-L534`), so the mini surface must not reuse those schemas unfiltered.

`task list` and the task-specific root `search` command may accept query, limit, ready-state, and filters over allowed task fields. Filters over excluded fields, including project and modified files, are absent (#1; `src/mcp/utils/schema-generators.ts:L74-L159`; `src/mcp/utils/schema-generators.ts:L539-L620`).

Object input schemas reject unknown properties. CLI options outside the task allowlist are removed before parsing. Task results are constructed through positive projection rather than redaction, ensuring newly introduced upstream properties remain hidden (#1).

Allowed edits pass a narrow patch into the existing persistence layer. That layer continues loading the complete task, changing only approved properties, and writing the complete record back. Existing excluded metadata is therefore preserved byte-for-byte where the current serializer permits and semantically unchanged otherwise (#1).

`task complete` performs only the status transition supported by the existing command. Mini does not expose completion-time final-summary, archive, due-date, or other excluded inputs (#1).

## Document and Milestone Contracts

Documents retain all five current operations: list, search, view, create, and update. Their public fields are title, content, type, path, and tags, with identifiers and timestamps read-only (#1). These correspond to the current document tool family (`src/mcp/tools/documents/index.ts:L21-L85`).

Milestones expose list, add, rename, and remove. Public data comprises name/title and description. Rename retains its `updateTasks` control; removal retains `taskHandling` and `reassignTo`. Due date and archive are absent (#1). The upstream milestone registrar currently also exposes archive (`src/mcp/tools/milestones/index.ts:L14-L76`), which the mini registrar must omit.

## Architecture

### One immutable surface policy

A small internal module defines the complete mini contract as immutable command, tool, option, input-field, output-field, and resource allowlists. It is the only place where public capability is expanded. Absence from the policy means absence from the public surface (#1).

The policy is internal implementation detail, not a new public library API. This respects the project's explicit boundary that source exports are not supported external interfaces (`AGENTS.md:L65-L71`).

### CLI enforcement

The CLI continues using upstream command implementations. Before help generation, completion extraction, argument parsing, or bare-root behavior, a policy pass removes disallowed commands, aliases, short option forms, and options from the Commander graph. Group commands with no allowed child are removed. The root bare-run shortcut is replaced with restricted help, and allowed commands take their noninteractive branches, so neither path can enter an excluded UI (#1; `src/cli.ts:L878-L923`).

Applying the policy to the actual Commander graph makes discovery and execution share one source of truth. The existing completion code derives names, options, and aliases from that graph (`src/completions/command-structure.ts:L27-L46`; `src/completions/command-structure.ts:L104-L159`), so it cannot reveal pruned entries even if completion is later reused internally.

### MCP enforcement

MCP registration checks the same operation policy and invokes only approved task, document, and milestone registrations. Restricted schema factories build inputs from positive allowlists and set `additionalProperties: false`. Handler results pass through the shared positive field projection before serialization (#1).

Selective registration is required at both current registration sites, including transport upgrades, so connection mode cannot change the tool surface (`src/mcp/server.ts:L266-L271`; `src/mcp/server.ts:L545-L550`).

### No bypass

There is no configuration, environment switch, alternate command prefix, legacy alias, fallback resource, or MCP initialization path that restores excluded capabilities (#1). Internal functions remain callable only by in-process code and are not treated as stable public interfaces (`AGENTS.md:L65-L71`).

## Error Behavior

- Unknown or excluded CLI command: non-zero unknown-command error with no suggestion for excluded commands (#1).
- Unknown or excluded CLI option: non-zero unknown-option error (#1).
- Unknown or excluded MCP tool: standard tool-not-found error (#1).
- Extra MCP input property: schema validation error before handler execution (#1).
- MCP used outside a project: concise initialization-required startup or operation failure without advertising an initialization tool or resource (#1).

Error messages must not enumerate the excluded upstream surface (#1).

## Verification Strategy

Tests treat the allowed surface as an exact set, not a partial containment check (#1):

1. Snapshot or set-compare root and nested CLI commands, aliases, and options.
2. Assert every excluded command and alias fails to invoke.
3. Assert bare CLI invocation shows restricted help only.
4. Start MCP through each registration path and exact-set compare advertised tools and resources.
5. Assert excluded MCP tool names return tool-not-found.
6. Exact-set compare task input schema properties and assert unknown properties are rejected.
7. Feed task results containing every known excluded field plus a synthetic future field through CLI and MCP formatters; assert only allowed fields and read-only identifiers/timestamps remain.
8. Edit an existing task containing excluded metadata and assert that metadata remains unchanged.
9. Verify archive and due-date operations are absent across task and milestone entry points.
10. Exercise all allowed task, document, and milestone operations as smoke coverage.

The contract tests are the fail-closed boundary against upstream drift, a risk the manifesto explicitly identifies (`MANIFESTO.md:L111-L115`). Existing unrelated Windows-only failures observed before implementation are recorded as baseline noise for this task; scoped tests, type checking, formatting/linting, and the build remain required by BACK-687.

## Repository and Maintenance

The fork lives at `glitchwerks/mini-backlog.md`. Its `origin`/fork remote points there and its `upstream` remote points to `MrLesk/Backlog.md`. GitHub defines forks as repositories that share code and visibility settings with an upstream repository ([About permissions and visibility of forks](https://docs.github.com/en/pull-requests/reference/forks), fetched 2026-09-14).

Mini-specific changes live on the fork's `main`. Periodic upstream merges are followed by the exact-surface suite; any newly registered command, option, field, tool, or resource fails tests until explicitly accepted into the immutable policy (#1).

`README.md` will identify the fork, list the supported CLI and MCP operations, state that excluded capabilities are genuinely undiscoverable and uncallable, and document the unchanged executable/package identity (#1). No general upstream documentation will imply that removed surfaces remain supported.

## Open Questions

None. The product choices needed for implementation are fixed by #1 and the approved conversation that produced it.
