# Mini Backlog Browser Restoration Design

**Date:** 2026-09-19

**Status:** Approved for implementation planning

**Tracking:** GitHub issue #5; Backlog task BACK-688

## Context

`mini-backlog.md` was designed to hide every CLI and MCP capability outside its approved task, document, and milestone subset. The accepted restricted-surface design explicitly excluded the browser and prohibited a route back to the full upstream surface (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L9-L15`; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L26-L31`; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L33-L60`).

Issue #5 deliberately reverses that decision for one human-facing surface: mini will expose the complete upstream browser while keeping every other CLI command and every MCP registration restricted. The browser is therefore a documented exception, not a runtime switch that restores the unrestricted CLI or MCP (#5).

The implementation already contains the upstream browser command, local server, web application, and build plugin. Mini currently suppresses the command through its positive CLI allowlist and exact-surface tests rather than removing the browser implementation (`src/cli.ts:L5870-L5948`; `src/mini/surface-policy.ts:L6-L104`; `src/test/mini-cli-surface.test.ts:L12-L73`).

The browser calls local HTTP endpoints rather than invoking CLI commands or MCP tools, but the server directly imports MCP milestone handlers and MCP-specific errors. Milestone update and removal routes call those handlers, so restoring the command without refactoring would leave the browser coupled to a hidden adapter (`src/web/lib/api.ts:L163-L179`; `src/web/lib/api.ts:L425-L642`; `src/server/index.ts:L1-L13`; `src/server/index.ts:L1568-L1612`; `src/server/index.ts:L1705-L1766`).

## Product Decision

The browser is a full upstream surface. It may expose fields and operations that remain unavailable through mini's CLI and MCP, including browser-backed decisions, drafts, configuration, archive operations, and due dates (#5). This is an intentional surface difference under the manifesto's allowance for deliberate divergence, while shared validation and mutation semantics remain in the product model (`MANIFESTO.md:L55-L66`; `MANIFESTO.md:L89-L93`).

The browser remains loopback-only, desktop-first, and best-effort responsive. Restoring it must not weaken its current bind, launch, keyboard, focus, or narrow-screen behavior (`MANIFESTO.md:L68-L79`; `src/cli.ts:L5870-L5925`).

## Goals

- Expose `backlog browser` in mini with canonical `--port` and `--no-open` options while retaining the current loopback bind and automatic-open default (#5; `src/cli.ts:L5870-L5925`).
- Serve the existing upstream browser UI and HTTP API without mini-specific field or operation filtering (#5).
- Remove direct and transitive browser/server dependencies on CLI, command-adapter, and MCP modules (#5).
- Put milestone mutation semantics and errors behind a shared core boundary used by the browser, CLI, and MCP adapters (#5; `MANIFESTO.md:L89-L93`).
- Preserve the fail-closed CLI and MCP contracts for every surface other than the new browser command (#5; `src/mini/surface-policy.ts:L6-L104`).
- Verify source and installed mini artifacts contain a working browser, not merely a help entry (#5; `scripts/build.ts:L20-L38`; `src/test/mini-compiled-entry.test.ts:L35-L120`).

## Non-goals

- Building a mini-specific browser, hiding browser controls, or projecting mini's restricted task fields into browser responses (#5).
- Restoring `init`, `board`, `config`, `decision`, `draft`, `doctor`, `cleanup`, or other excluded CLI commands (#5).
- Expanding MCP tools, resources, prompts, schemas, or result fields (#5).
- Redesigning the web UI or changing its existing API contracts; this work restores access and removes adapter coupling (#5).
- Fixing unrelated Windows baseline failures recorded before product changes (`backlog/tasks/back-688 - Restore-the-full-upstream-browser-interface.md:L42-L46`).

## Public Contract

### CLI

Mini root help adds `browser` to the existing `task`, `search`, `doc`, `milestone`, and `mcp` groups. The mini policy adds exactly `browser: ["--port", "--no-open"]` and a browser description; the policy continues stripping the short `-p` alias and the internal `--non-interactive` option from mini help and parsing (`src/mini/surface-policy.ts:L6-L104`; `src/mini/commander-policy.ts:L37-L66`; `src/cli.ts:L5870-L5925`).

`backlog browser` requires an existing Backlog project, chooses the configured/default port, selects the next available port in noninteractive runs, starts the shared server, and shuts down on the existing signals. The command binds only to `127.0.0.1`, opens the browser unless `--no-open` is supplied, and does not gain a public host override (`src/cli.ts:L5877-L5947`; `src/test/cli-browser-port.test.ts:L70-L105`; `src/test/server-hostname.test.ts:L35-L96`).

All other exact CLI paths, arguments, aliases, and options remain defined by the existing positive allowlist. Browser restoration changes the expected root command set and browser-specific option expectations only (`src/mini/surface-policy.ts:L6-L104`; `src/test/mini-cli-surface.test.ts:L12-L73`; `src/test/mini-cli-surface.test.ts:L137-L165`).

### Browser

The browser serves the existing web application and API routes unchanged. No mini projection or allowlist is added to task, document, decision, draft, milestone, configuration, statistics, cleanup, or search endpoints (#5; `src/server/index.ts:L423-L522`; `src/web/lib/api.ts:L425-L642`).

The server and web source trees must have no imports from `src/cli.ts`, `src/commands`, or `src/mcp`. This is a source dependency rule in addition to the runtime requirement that browser behavior remain complete when hidden commands and MCP registrations are absent (#5).

### MCP

The MCP tool, schema, resource, prompt, and output allowlists do not change. Browser availability must not register any new MCP capability or provide an MCP bypass (#5; `src/mini/surface-policy.ts:L106-L164`; `scripts/smoke-compiled-build.ts:L77-L116`).

## Architecture

### 1. Restore the command through the existing policy

Add the browser command and its two approved long options to `MINI_CLI_OPTIONS`, plus its user-facing description to `MINI_CLI_DESCRIPTIONS`. Continue applying the existing Commander pruning pass so discovery and invocation use one fail-closed policy (`src/mini/surface-policy.ts:L6-L104`; `src/mini/commander-policy.ts:L19-L66`).

Do not add a second entrypoint, feature flag, or mini-only server. The current command dynamically imports and starts the shared `BacklogServer`, so allowlisting that command reuses the upstream implementation without duplicating launch behavior (`src/cli.ts:L5870-L5925`; `MANIFESTO.md:L89-L93`).

### 2. Move milestone semantics into core

Create a core milestone-operations module that owns add, rename, remove, and archive semantics. It will contain the existing alias validation, task-reference updates, rollback behavior, auto-commit coordination, and user-facing mutation summaries currently implemented by `MilestoneHandlers` (`src/mcp/tools/milestones/handlers.ts:L225-L279`; `src/mcp/tools/milestones/handlers.ts:L375-L413`; `src/mcp/tools/milestones/handlers.ts:L419-L590`; `src/mcp/tools/milestones/handlers.ts:L594-L725`).

Every mutation returns `MilestoneOperationResult`, defined as `{ message: string; milestone?: Milestone; updatedTaskIds: string[] }`, and throws a core milestone-operation error with `VALIDATION_ERROR`, `NOT_FOUND`, or `INTERNAL_ERROR`. The core module must not return MCP `CallToolResult` objects or import mini runtime state; adapters wrap the result for their own transport (#5; `MANIFESTO.md:L89-L93`).

Move the milestone alias helpers now under `src/mcp/utils/milestone-resolution.ts` into the existing core milestone module. That module already owns milestone normalization, keys, alias maps, and browser-facing bucket semantics, so one core implementation avoids leaving a transitive MCP dependency or maintaining parallel alias rules (`src/core/milestones.ts:L1-L207`; `src/mcp/utils/milestone-resolution.ts:L1-L139`; `MANIFESTO.md:L89-L93`).

Keep the existing low-level `Core.renameMilestone` and `Core.archiveMilestone` file/Git primitives. The new operation layer composes those primitives with multi-task updates and rollback rather than duplicating persistence (`src/core/backlog.ts:L3379-L3454`).

### 3. Make each adapter thin

- The browser server calls core milestone operations and maps core error codes to HTTP status codes. Request-body JSON validation uses a server-local request error, not an MCP error (#5; `src/server/index.ts:L1568-L1612`).
- The CLI calls core milestone operations and prints their messages. It no longer imports MCP milestone handlers (`src/cli.ts:L54-L55`; `src/cli.ts:L537-L541`).
- The MCP milestone handler delegates to core operations and wraps each message in the existing MCP content envelope. MCP registration and schema filtering remain unchanged (#5; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L92-L116`).

The browser's milestone create, update, remove, and archive endpoints all use the core operation layer. List and get routes may continue reading milestone records through Core/filesystem because they do not duplicate mutation semantics (`src/server/index.ts:L1615-L1769`).

### 4. Preserve the browser data flow

```text
browser UI
    -> local HTTP/WebSocket server
        -> shared Core + milestone operations
            -> Markdown/filesystem/Git

CLI adapter ----^
MCP adapter ----^
```

Only adapters format transport-specific inputs and outputs. The browser never shells out to `backlog`, calls MCP, or imports their implementation modules (#5; `MANIFESTO.md:L55-L66`).

## Error Behavior

- Invalid browser request JSON remains HTTP 400 with a concise JSON error body; this is server transport validation, not a milestone-domain error (`src/server/index.ts:L1568-L1612`).
- Core validation errors map to HTTP 400, missing milestones map to HTTP 404, and internal/rollback failures map to HTTP 500. MCP and CLI retain their existing user-facing messages (#5; `src/server/index.ts:L1596-L1612`; `src/mcp/tools/milestones/handlers.ts:L419-L725`).
- Port validation, occupied-port fallback, browser-launch warnings, and signal shutdown retain the existing command behavior (`src/cli.ts:L5883-L5947`).
- Browser restoration does not change unknown-command or unknown-tool behavior for any still-excluded CLI or MCP operation (#5; `src/test/mini-cli-surface.test.ts:L45-L73`; `scripts/smoke-compiled-build.ts:L40-L53`; `scripts/smoke-compiled-build.ts:L104-L110`).

## Testing

Implementation follows test-driven development. Exact mini CLI tests first change from rejecting `browser` to requiring it and assert that browser help exposes only `--port`, `--no-open`, and `--help` (`src/test/mini-cli-surface.test.ts:L12-L73`; `src/test/mini-cli-surface.test.ts:L137-L165`).

A browser dependency-boundary test walks the relative import graph starting at `src/server` and `src/web` and fails if any reachable module is under `src/cli.ts`, `src/commands`, or `src/mcp`. Milestone operation tests exercise the extracted core behavior, while existing CLI, MCP, and server milestone tests verify adapter parity (#5; `src/test/cli-milestone-management.test.ts:L38-L173`; `src/test/mcp-milestones.test.ts`; `src/test/server-milestone-broadcast.test.ts`).

Browser API integration tests exercise representative capabilities hidden from mini CLI/MCP, including a due-dated milestone and milestone archive, through the local HTTP API. Existing loopback, auto-open, no-open, and port-congestion tests remain part of focused verification (#5; `src/test/server-milestone-broadcast.test.ts`; `src/test/server-hostname.test.ts`; `src/test/cli-browser-port.test.ts`).

Compiled artifact tests require `browser` in mini help, start the compiled binary against a seeded project with `--no-open`, wait for `/api/status`, verify a browser route, and terminate it cleanly. The installed-package assertion continues proving that the packed package runs the same source-built binary (`scripts/build.ts:L20-L38`; `src/test/mini-compiled-entry.test.ts:L35-L120`; `scripts/smoke-compiled-build.ts:L18-L76`).

Focused completion gates are the browser, milestone, mini-surface, MCP-surface, compiled-package, and dependency-boundary suites plus type checking, Biome, build, and compiled smoke. The unrelated Windows full-suite baseline failures remain recorded in the task (`backlog/tasks/back-688 - Restore-the-full-upstream-browser-interface.md:L42-L46`).

## Documentation and Compatibility

Update the README command table with `backlog browser`, `--port`, and `--no-open`. Replace the claim that every unlisted upstream operation is unavailable with an explicit statement that CLI and MCP remain restricted while the browser intentionally exposes the complete upstream human-facing surface (`README.md:L20-L24`; `README.md:L26-L50`; `README.md:L83-L89`).

Keep the 2026-09-14 restricted-surface design as historical context. This design and issue #5 supersede only its browser exclusion; its CLI and MCP field/tool restrictions remain authoritative (`docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L9-L31`; `docs/superpowers/specs/2026-09-14-mini-backlog-restricted-surface-design.md:L92-L120`).

## Risks and Mitigations

- **Surface drift:** the browser intentionally has more capability than CLI/MCP. Mitigation: document the exception and retain exact contract tests for all three surfaces (#5; `MANIFESTO.md:L111-L115`).
- **Adapter coupling returning:** browser/server imports could silently reach MCP again. Mitigation: a static dependency-boundary test plus browser API integration coverage (#5).
- **Milestone behavior regression during extraction:** rename/remove currently include multi-file rollback and commit handling. Mitigation: move semantics without redesigning them, then run existing CLI/MCP/server parity suites (`src/mcp/tools/milestones/handlers.ts:L419-L725`).
- **A help-only restoration:** the command could appear while compiled assets fail. Mitigation: launch the compiled artifact and fetch the live browser API in smoke coverage (`scripts/build.ts:L20-L38`; `src/test/mini-compiled-entry.test.ts:L35-L120`).

## Decision Summary

Restore the existing upstream browser through mini's positive CLI policy, expose its full UI/API without mini filtering, extract milestone mutations and alias resolution into core, and keep CLI/MCP as independent restricted adapters. This satisfies issue #5 with one browser implementation and one milestone implementation (`MANIFESTO.md:L89-L93`; #5).
