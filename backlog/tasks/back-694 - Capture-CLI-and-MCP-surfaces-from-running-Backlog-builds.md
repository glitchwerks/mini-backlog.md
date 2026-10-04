---
id: BACK-694
title: Capture CLI and MCP surfaces from running Backlog builds
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 13:00'
updated_date: '2026-10-04 01:14'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/10'
type: enhancement
ordinal: 322000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execution record for GitHub issue #10 in milestone #1. Capture the CLI and MCP surface from a selected build without Git or internal full-mode imports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Capture complete CLI help and paginated MCP discovery as deterministic versioned JSON.
- [x] #2 Launch failures, timeouts, and malformed discovery fail without partial manifests.
- [x] #3 Tests cover edge cases and real mini discovery; README documents usage.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement GitHub #10 with failing tests first, external-process CLI and MCP discovery, repeatability and cleanup checks, documentation, and a scoped PR against the initiative branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented external-process CLI help traversal and paginated MCP discovery with canonical JSON, atomic publication, explicit targets, failure handling, process cleanup, and documentation. Review findings for malformed help, SIGTERM-resistant timeout handling, and eager SDK output-schema compilation were reproduced and fixed; follow-up review found no actionable findings. Real source captures and compiled captures are byte-identical; compiled inventory contains 24 command entries and 15 MCP tools. Type check and focused CRLF-aware Biome checks pass. Build succeeds via bun scripts/build.ts; bun run build encounters a dependency-local Bun launcher remap error in this environment. Existing mini CLI excluded-decision search test timed out before implementation and again in isolation; other baseline CLI cases passed. POSIX SIGTERM-resistant test is skipped on Windows. Whole-repository formatting is not claimed; prior PR #9 records existing CRLF formatting diagnostics.

Final verification: 32 discovery/MCP tests passed, 1 POSIX-only skip; type check, focused CRLF-aware formatting, production build, and compiled CLI/browser smoke passed. Two captures within each of the source and compiled modes produce identical bytes. Whole-tree CRLF-aware Biome check reports one unchanged src/utils/task-builders.ts diagnostic, matching PR #9 baseline. Final independent review reports no actionable findings.

PR #19 merged into main as 5e38dda1; all six jobs passed on reviewed head 92529920 in CI run 37165864478, including the Linux full suite and all platform compile/browser/runtime checks. GitHub #10 closed. Durable discovery rationale was extracted to #10 before retiring its completed standalone execution plan; no committed consumers referenced that plan.

Completion reconciliation: PR #19 merged into main at 5e38dda1 and closed #10, #11, #12 and #13. Reviewed head 92529920 passed all six jobs in run 37165864478, including Ubuntu bun run check, type checks, the full test suite and interactive TUI regressions, plus all three platform compile/smoke/runtime-surface checks (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37165864478). This verified whole-tree formatting result completes DoD #2. These integration results supersede the earlier local pending, incomplete-suite and formatting-diagnostic notes, which remain as historical evidence. Permanent branch/default/ruleset administration remains pending the separate decision in #14.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated deterministic external CLI/MCP discovery, paginated schemas, failure handling, process cleanup and usage documentation through PR #19 (5e38dda1), closing #10. Repeatability and compiled capture checks passed; reviewed head 92529920 passed all six jobs in CI run 37165864478, including Ubuntu formatting/types/full suite and three-platform compile/smoke/runtime checks. Response probes, baseline comparison and CI gating also integrated in PR #19; permanent branch/default/ruleset administration remains pending #14.
<!-- SECTION:FINAL_SUMMARY:END -->
