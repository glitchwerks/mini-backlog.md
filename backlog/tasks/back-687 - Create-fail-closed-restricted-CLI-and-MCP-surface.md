---
id: BACK-687
title: Create fail-closed restricted CLI and MCP surface
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-15 00:10'
updated_date: '2026-09-15 13:08'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/1'
type: feature
ordinal: 318000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Limit mini-backlog.md to task, document, and milestone management so agents cannot discover or invoke unrelated Backlog.md capabilities and do not need prompt instructions to avoid them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLI exposes only help, version, MCP startup, and approved task, document, and milestone operations
- [ ] #2 MCP exposes only approved task, document, and milestone tools with no workflow or Definition-of-Done resources or tools
- [ ] #3 Task inputs and outputs expose only the approved task fields while preserving hidden metadata during permitted edits
- [ ] #4 Task and milestone archive operations and all due-date fields are unavailable
- [ ] #5 Exact-surface tests keep future upstream commands, tools, options, and fields hidden by default
- [ ] #6 README identifies mini-backlog.md and documents its restricted surface
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Encode immutable command, option, MCP tool, schema-property, and output-field allowlists with fail-closed Commander tests. 2. Route the shipped CLI through the mini policy, disable interactive bypasses, and keep upstream full-surface regression coverage in an unshipped test entry. 3. Add positive task schema and output projections and verify hidden metadata survives permitted edits. 4. Restrict MCP registration and milestone schemas/output while retaining document management. 5. Update repository documentation and metadata, build the executable, run scoped checks, and record baseline-only full-suite failures.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Documented the exact mini CLI, MCP, and task-field allowlists; package repository metadata now identifies glitchwerks/mini-backlog.md. Scoped mini suite passed (44 tests), typecheck passed, and the new README/package contract test passed. bun run check . still reports the approved 408 CRLF-only baseline diagnostics. bun run build created dist/backlog.exe, but that binary exits 0 without help output and accepts excluded commands; source CLI smoke passes. A CI-targeted baseline build could not download/extract bun-windows-x64-baseline-v1.3.14. Full bun run test was stopped after known Windows-only TUI board, Claude-agent symlink, and browser EBUSY failures; no mini failure appeared.
<!-- SECTION:NOTES:END -->
