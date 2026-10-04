---
id: BACK-699
title: Remove optional Nix packaging and CI
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 23:47'
updated_date: '2026-10-04 01:21'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/18'
ordinal: 327000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The user decided the source-only mini fork does not need a separate Nix package. Retire the package and maintenance lane instead of fixing the Nix browser failure; retain the ordinary source-build and local installation workflow.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Nix recipes, generated locks, update command and Nix-only CI lane are retired.
- [x] #2 Existing source build, local install and CLI/browser smoke pass.
- [x] #3 Active documentation and proposed required checks reflect the removal; historical records remain explicit.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Remove the isolated Nix recipe/lock files and CI/package script identified in issue #18. Update README/DEVELOPMENT, smoke/test descriptions and the #14 ruleset/proposal. Run source distribution/local package/compiled smoke tests plus types and scoped formatting, review, commit and publish through existing initiative PR #17. Sources: flake.nix, package.json scripts, .github/workflows/ci.yml, DEVELOPMENT.md Nix Packaging, issues #16/#18.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed Nix recipes/locks, update command, lock verification and package job; updated active documentation and six-check proposal. Verified 14/14 compiled-entry, local install, source-distribution and package-contract tests with browser smoke; 55 assertions. TypeScript and scoped CRLF-aware Biome passed. Restricted-shell fixture rename failed; rerun with normal filesystem access passed. Fixed a pre-existing CRLF-sensitive source-tag regex (raw input failed while LF-normalized passed). Independent review found no actionable findings. Historical Nix failure retained in GitHub #16, now scoped to Linux board-output. Whole-tree formatting remains the pre-existing unrelated diagnostic, not claimed green.

Completion reconciliation: PR #19 merged into main at 5e38dda1 and closed GitHub issue #18. Reviewed head 92529920 passed all six jobs in run 37165864478, including Ubuntu bun run check, type checks, the full test suite and interactive TUI regressions, plus all three platform compile/smoke/runtime-surface checks (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37165864478). This verified whole-tree formatting result completes DoD #2. These integration results supersede the earlier local formatting diagnostic and pending GitHub-closure entries, which remain as historical evidence. Permanent branch/default/ruleset administration remains pending the separate decision in #14.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated optional Nix packaging and CI retirement through PR #19 (5e38dda1), closing #18. Source build, local installation and browser smoke passed 14 focused tests; reviewed head 92529920 passed all six jobs in CI run 37165864478, including Ubuntu formatting/types/full suite and three-platform compile/smoke/runtime checks. Proposed required checks retain six source-build/test contexts; permanent branch/default/ruleset administration remains pending #14.
<!-- SECTION:FINAL_SUMMARY:END -->
