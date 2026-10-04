---
id: BACK-700
title: Guard required PR checks against branch and path filters
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 12:24'
updated_date: '2026-10-04 12:29'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/23'
ordinal: 328000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub issue #23: extend the existing CI contract test to reject pull_request branches, branches-ignore, paths and paths-ignore. Preserve valid unfiltered null/empty-object triggers and the existing six required contexts. This is the deferred guard from PR #21, explicitly requested after PR #22.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each of the four PR branch/path filter keys causes the guard to fail.
- [x] #2 Unfiltered null and empty-object PR triggers pass.
- [x] #3 Mutation checks restore the workflow byte-for-byte; relevant tests, types and formatting pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extended the existing CI contract test to reject pull_request branches, branches-ignore, paths and paths-ignore without introducing a helper or changing workflow/product behavior. Before the change, each injected filter passed unnoticed. After the change, each failed the new toHaveProperty assertion; unfiltered null and empty-object triggers passed. The probe restored the actual workflow byte-for-byte. Five focused tests passed with 23 assertions, TypeScript passed, and scoped CRLF-aware Biome passed. Full Linux CI formatting and final merge checks remain required before integration. Sources: GitHub #23, existing source-distribution test and actual mutation/test outputs. No committed file depends on local probe logs.

Fresh read-only review found no issues and independently confirmed 5 passing tests/23 assertions. GitHub PR #24 run 37202146318 on head 8f5047e6 passed full Linux check:types and check steps; required platform/test/runtime jobs continue. No task/probe output is required as a runtime artifact. Final simplification review retains the single existing test and a four-key absence loop; no new production helper or workflow changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added a four-key pull_request filter regression guard to the existing CI contract test. All four injected filters passed before and fail after the guard; null and empty-object unfiltered triggers pass. Actual workflow restored byte-for-byte. Five focused tests/23 assertions, TypeScript, scoped CRLF-aware Biome and full Linux CI type/format checks passed; fresh independent review found no issues. PR #24 integrates the test and record only after all six current-head checks and reviews pass. GitHub #23 tracks the change.
<!-- SECTION:FINAL_SUMMARY:END -->
