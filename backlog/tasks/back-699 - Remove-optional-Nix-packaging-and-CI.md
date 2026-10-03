---
id: BACK-699
title: Remove optional Nix packaging and CI
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 23:47'
updated_date: '2026-10-03 23:55'
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
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Remove the isolated Nix recipe/lock files and CI/package script identified in issue #18. Update README/DEVELOPMENT, smoke/test descriptions and the #14 ruleset/proposal. Run source distribution/local package/compiled smoke tests plus types and scoped formatting, review, commit and publish through existing initiative PR #17. Sources: flake.nix, package.json scripts, .github/workflows/ci.yml, DEVELOPMENT.md Nix Packaging, issues #16/#18.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Removed Nix recipes/locks, update command, lock verification and package job; updated active documentation and six-check proposal. Verified 14/14 compiled-entry, local install, source-distribution and package-contract tests with browser smoke; 55 assertions. TypeScript and scoped CRLF-aware Biome passed. Restricted-shell fixture rename failed; rerun with normal filesystem access passed. Fixed a pre-existing CRLF-sensitive source-tag regex (raw input failed while LF-normalized passed). Independent review found no actionable findings. Historical Nix failure retained in GitHub #16, now scoped to Linux board-output. Whole-tree formatting remains the pre-existing unrelated diagnostic, not claimed green.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Retired optional Nix packaging under #18; source build, local installation and browser smoke verified by 14 passing tests. Proposed merge checks now retain six source-build/test contexts. Published through PR #17; GitHub closure awaits main integration.
<!-- SECTION:FINAL_SUMMARY:END -->
