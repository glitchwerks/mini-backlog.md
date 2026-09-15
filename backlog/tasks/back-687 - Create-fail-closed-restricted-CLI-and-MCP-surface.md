---
id: BACK-687
title: Create fail-closed restricted CLI and MCP surface
status: Done
assignee:
  - '@codex'
created_date: '2026-09-15 00:10'
updated_date: '2026-09-15 13:26'
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
- [x] #1 CLI exposes only help, version, MCP startup, and approved task, document, and milestone operations
- [x] #2 MCP exposes only approved task, document, and milestone tools with no workflow or Definition-of-Done resources or tools
- [x] #3 Task inputs and outputs expose only the approved task fields while preserving hidden metadata during permitted edits
- [x] #4 Task and milestone archive operations and all due-date fields are unavailable
- [x] #5 Exact-surface tests keep future upstream commands, tools, options, and fields hidden by default
- [x] #6 README identifies mini-backlog.md and documents its restricted surface
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun test (or scoped test) passes
- [x] #3 Focused Biome checks on every changed file passed; repository-wide bun run check . produced 408 CRLF-only baseline diagnostics under the mandated Windows convention and was explicitly waived by the user.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Encode immutable command, option, MCP tool, schema-property, and output-field allowlists with fail-closed Commander tests. 2. Route the shipped CLI through the mini policy, disable interactive bypasses, and keep upstream full-surface regression coverage in an unshipped test entry. 3. Add positive task schema and output projections and verify hidden metadata survives permitted edits. 4. Restrict MCP registration and milestone schemas/output while retaining document management. 5. Update repository documentation and metadata, build the executable, run scoped checks, and record baseline-only full-suite failures.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the fail-closed mini CLI and MCP surface, exact README/package identity contract, and compiled-entry regression. Final verification: all six mini suites passed (48 pass, 0 fail, 241 assertions); bunx tsc --noEmit passed; focused Biome checks on every changed file passed with the mandated CRLF convention; bun run build passed; dist/backlog.exe printed restricted help and rejected board, task archive, and milestone archive with exit 1; the actual bundle retained cli.js and restricted help; importing src/cli.ts remained silent; and the unshipped full internal entry retained the full surface. Repository-wide bun run check . did not pass: it produced 408 CRLF-only baseline diagnostics under the mandated Windows convention and was explicitly waived by the user. Full bun run test was attempted and interrupted after approved unrelated Windows failures, so final counts are unavailable. Observed failures: TUI board single-task mover > moves only the selected task and confirms with Enter; TUI board single-task mover > confirms with M exactly like Enter; TUI board multi-select mover > persists cross-column recruits in exactly the order rendered by the collapse preview; TUI board multi-select mover > freezes the move set and ignores Escape while the confirm write is in flight; TUI board multi-select mover > reports per-task failures in the transient footer and still moves the rest; installClaudeAgent > writes the project-manager-backlog.md file with correct content (Claude-agent symlink handling); browser command port selection > auto-selects the next available port without prompting in non-TTY runs (EBUSY browser-cleanup failure). No mini-surface failure appeared before interruption.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restricted mini surface completed: documented exact public CLI/MCP/task fields, preserved backlog.md/backlog identities, and verified source, bundle, and compiled executable fail closed with 48 scoped tests.
<!-- SECTION:FINAL_SUMMARY:END -->
