---
id: BACK-696
title: Compare runtime surfaces against a reviewed mini baseline
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 16:29'
updated_date: '2026-10-03 17:02'
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
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Validate runtime manifest structure and compare keyed public surfaces (#12; scripts/surface-manifest.ts). 2. Add explicit pairwise report CLI with no baseline writes (#12). 3. Capture identified mini/upstream builds and review baseline/report artifacts against README restrictions (#12; README.md). 4. Verify drift/failure tests and committed references (#12).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline reviewed against README CLI options, 15 MCP tools, task MCP input and summary/detail fields; conformance exact. True upstream tags compiled without overrides and retained observed version mismatch. Three reports show 21 upstream changes, 217 upstream-to-mini differences and zero independent mini candidate drift. Ten comparison tests passed, one Windows symlink skip; hardlink protection verified. TypeScript/scoped CRLF-aware Biome passed; independent review findings fixed and follow-up clear. Explicit baseline approval occurs through reviewed PR merge; no auto replacement. Full local suite failed/stalled in unrelated cases recorded in #16.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Captured identified mini/upstream baselines, persisted all three report pairs, and added safe deterministic keyed surface comparison with complete manifest checks. Reviewed baseline conformance and zero candidate drift; type and scoped tests passed.
<!-- SECTION:FINAL_SUMMARY:END -->
