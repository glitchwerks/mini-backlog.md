---
id: BACK-696
title: Compare runtime surfaces against a reviewed mini baseline
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 16:29'
updated_date: '2026-10-04 01:15'
labels: []
dependencies:
  - BACK-695
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/12'
ordinal: 324000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Synchronizations need separate answers for upstream changes, deliberate mini exclusions and accidental mini changes; captured candidates must not silently redefine approval.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Identified baseline and deliberate restrictions are persisted and reviewed.
- [x] #2 Deterministic JSON and Markdown report additions/removals and schema/response changes, excluding build identity drift.
- [x] #3 Incomplete or incompatible inputs fail; tests cover tools/options/fields and required/type/enum changes.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validate runtime manifest structure and compare keyed public surfaces (#12; scripts/surface-manifest.ts). 2. Add explicit pairwise report CLI with no baseline writes (#12). 3. Capture identified mini/upstream builds and review baseline/report artifacts against README restrictions (#12; README.md). 4. Verify drift/failure tests and committed references (#12).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline reviewed against README CLI options, 15 MCP tools, task MCP input and summary/detail fields; conformance exact. True upstream tags compiled without overrides and retained observed version mismatch. Three reports show 21 upstream changes, 217 upstream-to-mini differences and zero independent mini candidate drift. Ten comparison tests passed, one Windows symlink skip; hardlink protection verified. TypeScript/scoped CRLF-aware Biome passed; independent review findings fixed and follow-up clear. Explicit baseline approval occurs through reviewed PR merge; no auto replacement. Full local suite failed/stalled in unrelated cases recorded in #16.

The explicit approval boundary was satisfied by the user-authorized reviewed merge of PR #19 into main at 5e38dda1. GitHub #12 closed with its baseline criterion checked. All six CI jobs passed on reviewed head 92529920 in run 37165864478; baseline inputs and reports are committed.

Completion reconciliation: PR #19 merged into main at 5e38dda1 and closed #12 with the reviewed baseline approved. Reviewed head 92529920 passed all six jobs in run 37165864478, including Ubuntu bun run check, type checks, the full test suite and interactive TUI regressions, plus all three platform compile/smoke/runtime-surface checks (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37165864478). This verified whole-tree formatting result completes DoD #2. These integration results supersede the earlier local incomplete-suite and formatting-diagnostic notes, which remain as historical evidence. Permanent branch/default/ruleset administration remains pending the separate decision in #14.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated identified mini/upstream baselines, all three report pairs and safe deterministic surface comparison through PR #19 (5e38dda1), approving the reviewed baseline and closing #12. Baseline conformance, zero candidate drift and comparison tests passed; reviewed head 92529920 passed all six jobs in CI run 37165864478, including Ubuntu formatting/types/full suite and three-platform compile/smoke/runtime checks. Permanent branch/default/ruleset administration remains pending #14.
<!-- SECTION:FINAL_SUMMARY:END -->
