---
id: BACK-695
title: Capture deterministic runtime response shapes
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 16:10'
updated_date: '2026-10-04 01:14'
labels: []
dependencies:
  - BACK-694
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/11'
ordinal: 323000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Discovery alone misses changes to actual returned fields. Probe representative public operations in a disposable project so sync review can detect response drift.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Representative CLI and MCP task/document/milestone probes use disposable fixtures and clean up on failure.
- [x] #2 Shape records preserve field paths, types, observed presence and null variants while ignoring generated values.
- [x] #3 Repeatability and field/type/envelope drift tests pass; README documents coverage limits.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record shapes from raw public JSON and MCP envelopes using samples (#11). 2. Create sparse and populated fixtures through public commands, with cleanup on every path (#11; scripts/surface-manifest.ts). 3. Test structural drift and repeated actual mini capture; document limitations (#11).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verified 43 focused tests passed and one POSIX-only test skipped. TypeScript and scoped CRLF-aware Biome checks passed. Both independent review findings fixed and follow-up clear. Direct full suite remains running; bun run test has the existing dependency-local launcher remap failure. Whole-tree Biome limitation remains recorded in PR #15. GitHub issue #11 stays open until final integration.

Full local suite did not complete: failures and stalled MCP stdio test documented in GitHub #16. GitHub Windows/macOS jobs passed on baf842ef; Linux board and Nix browser failures remain. Subsequent actual upstream probes required omitting redundant agent-instructions when integration-mode is none; repeated mini response shape stays identical.

Completion reconciliation: PR #19 merged into main at 5e38dda1 and closed #11. Reviewed head 92529920 passed all six jobs in run 37165864478, including Ubuntu bun run check, type checks, the full test suite and interactive TUI regressions, plus all three platform compile/smoke/runtime-surface checks (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37165864478). This verified whole-tree formatting result completes DoD #2. These integration results supersede the earlier local pending, incomplete-suite and formatting-diagnostic notes, which remain as historical evidence. Permanent branch/default/ruleset administration remains pending the separate decision in #14.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated disposable public operation probes and deterministic CLI/MCP response shape capture through PR #19 (5e38dda1), closing #11. Verified repeatability, failure cleanup and unchanged previous output with 43 focused tests; reviewed head 92529920 passed all six jobs in CI run 37165864478, including Ubuntu formatting/types/full suite and three-platform compile/smoke/runtime checks. Permanent branch/default/ruleset administration remains pending #14.
<!-- SECTION:FINAL_SUMMARY:END -->
