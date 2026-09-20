---
id: BACK-688
title: Restore the full upstream browser interface
status: Done
assignee:
  - '@codex'
created_date: '2026-09-19 23:30'
updated_date: '2026-09-20 12:12'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/5'
  - 'https://github.com/glitchwerks/mini-backlog.md/pull/6'
type: feature
ordinal: 319000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the complete upstream browser to mini-backlog.md while keeping every other CLI and MCP restriction intact. The browser must operate through its local HTTP API and shared core behavior without depending on hidden CLI commands, MCP registration, or MCP-only implementation modules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The mini CLI exposes the browser command with the upstream port and no-open options
- [x] #2 The complete upstream browser UI and API work without mini-specific filtering
- [x] #3 The browser and server do not import from CLI, command, or MCP modules
- [x] #4 Shared milestone mutations and domain errors are reused through the shared core boundary
- [x] #5 All other mini CLI and MCP surfaces remain restricted
- [x] #6 Source builds and installed packages include browser assets and launch successfully
- [x] #7 Tests cover the exact surface, browser launch, representative browser API behavior, and dependency boundaries
- [x] #8 README documents the browser command and full-surface exception
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun test (or scoped test) passes
- [x] #3 Changed files pass scoped Biome semantic checks; repository-wide CRLF baseline is documented as an approved exception
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implementation plan: docs/superpowers/plans/2026-09-19-mini-browser-restoration.md

1. Restore `browser` through mini's positive CLI policy with only `--port` and `--no-open` (docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L42-L50).
2. Consolidate milestone alias resolution in core, then extract transport-neutral add/rename/remove/archive operations with stable domain errors (docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L70-L78).
3. Adapt CLI, MCP, and browser HTTP handlers to the shared operations; enforce that server/web imports cannot reach CLI, commands, or MCP (docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L80-L100).
4. Prove full browser behavior through HTTP integration coverage and a live compiled-binary smoke test while preserving exact restricted CLI/MCP tests (docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L109-L119).
5. Document the full browser as the deliberate exception to mini's restricted CLI/MCP contract (docs/superpowers/specs/2026-09-19-mini-browser-restoration-design.md:L121-L125).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline before product changes: dependency install was repaired after an interrupted sandboxed install left the local Bun shim incomplete. The untouched full test suite then exposed existing Windows/environment failures in TUI move timing and screen isolation, inherited Claude-agent fixture resolution, browser/doctor temporary-directory cleanup locks, and sandbox-denied repository lock creation. The run was stopped after the same unrelated failure classes repeated. No product code or design document had been changed.

Final validation: bunx tsc --noEmit passed; the focused browser/core/server/MCP matrix passed 97/97; the exact mini CLI surface passed 55/55 with a 30-second timeout; compiled source and installed-package tests passed 8/8; bun run build and the live compiled-browser smoke passed. Scoped Biome semantic checks passed for all 17 changed source/test files.

Alex approved the repository-wide CRLF formatter baseline (445 formatter-only diagnostics across 449 files) as an explicit exception on 2026-09-20. The original repository-wide formatter gate was replaced by the approved scoped semantic-check criterion; all three final Definition of Done items are satisfied without normalizing line endings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the full upstream browser as the deliberate exception to mini's restricted CLI/MCP surface. Browser/server behavior now uses shared core milestone operations and a tested dependency boundary that rejects CLI, command, and MCP imports. Verified exact CLI/MCP restrictions, representative browser APIs, source and installed compiled launches, TypeScript, build output, and live process cleanup; repository-wide formatting remains blocked only by the existing CRLF baseline.
<!-- SECTION:FINAL_SUMMARY:END -->
