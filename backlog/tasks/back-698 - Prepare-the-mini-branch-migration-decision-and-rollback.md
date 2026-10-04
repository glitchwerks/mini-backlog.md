---
id: BACK-698
title: Prepare the mini branch migration decision and rollback
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 17:19'
updated_date: '2026-10-04 12:04'
labels: []
dependencies:
  - BACK-697
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/14'
ordinal: 326000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prepare the concrete branch layout, upstream-based candidate evidence, administration proposal and rollback required by GitHub issue #14 before applying repository changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An upstream-based isolated candidate preserves mini tree and runtime surface.
- [x] #2 The proposal inventories branches, worktrees, PR bases, CI, installation and tags with rollback and verifiable sources.
- [x] #3 Repository administration is applied only after the concrete migration decision required by issue #14.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Completed: verify retained upstream-first candidate and reviewed mini baseline; preserve preflight/backup/main/tags; create pristine upstream and permanent mini; integrate CI/install/sync docs in PR #21; set default mini and repository ruleset 24454494; verify six exact required checks and merge ancestry on PR #22; record durable rollback in GitHub #14; close #14 and retire its completed plan. Sources: #14 final decision comment, PR #21, PR #22 and committed docs/surfaces evidence.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prepared an additive branch/default/PR-base/CI/install/tag migration and rollback proposal with verified sources and a concrete required-check ruleset payload. The selected upstream fd20f714 is already an ancestor of mini main. Disposable upstream-first merge bc1134f26c5226460c2cd5efd5d7875bbfbf2c6d has parents fd20f714 and cde1f7c5; its tree equals mini implementation 2481625603fe65392bf1e089cc6c7f0fa0a0e325. Built from that checkout with frozen isolated dependencies; compiled runtime capture has zero drift, CLI/browser smoke passes. Merge retained in initiative history via fast-forward. Snapshot and report are persisted in docs/surfaces/reports/upstream-based-candidate.*. This demonstration does not predict conflict-free future syncs. Current remote default/branches/tags/ruleset and local worktrees inventoried. Admin changes and publication remain pending the concrete #14 decision and clarification of unmerged PR #15 closure. No remote branch/default/tag/ruleset migration has been applied.

Independent review found no actionable proposal, evidence, citation or ruleset schema errors. All seven proposed check contexts and GitHub Actions app 15368 were verified against PR #15 check-runs. Candidate snapshot equals the baseline; report identity matches the retained merge. The three clean temporary capture/demo worktrees were removed after explicit path and status checks; active and unrelated worktrees remain. The required-check payload is a review proposal, not an applied ruleset.

Persistence audit after commit 9ccb5069: git ls-tree HEAD -- docs/surfaces verifies the inventory, proposed ruleset, upstream-based candidate snapshot and both reports; the proposal was verified committed then; its durable decision is now GitHub issue #14 and PR #21. All six required migration artifacts are committed. The earlier 18 capture/comparison/gate artifacts are also present in HEAD. git merge-base --is-ancestor bc1134f26c5226460c2cd5efd5d7875bbfbf2c6d HEAD succeeds. Deliverables reconcile with git diff main...HEAD --stat. Implementation branch is local and unpublished after baf842ef pending the PR #15 closure clarification.

The user approved restoring the initiative publication path. Primary branch codex/mini-surface-sync was restored at 1b369ba5 and replacement draft PR #17 opened; committed work was pushed to its existing source branch only after verifying the new PR remained open. The proposal now cites PR #17 and retains the original inventory as historical evidence. This approval does not apply the permanent upstream/mini/default/ruleset migration.

Issue #18 retires optional Nix packaging by user decision. The migration proposal and required-check payload now require six contexts. Historical Nix evidence remains in #16; no permanent branch/default/ruleset migration applied.

PR #19 integrated capture, reviewed baseline and gate into main at 5e38dda1 with retained demonstration ancestry and all six CI jobs green. The next #14 branch/default/ruleset decision is requested separately. Re-inventory found organization ruleset 15682536 active, main still default, and permanent upstream/mini names unused; unrelated worktrees remain untouched. The proposal now cites integrated evidence rather than pending publication.

The user approved the dedicated upstream/mini layout. Fresh preflight preserves main 92fa4940, all remote refs and inherited organization ruleset 15682536 in docs/surfaces/branch-migration-preflight.json. No open PR needs retargeting. Administration follows the reviewed migration PR.

Migration implementation verified: the new CI contract failed on missing mini branch trigger, then passed after adding mini. All 15 compiled-entry/local-install/source-distribution/package-contract tests passed (61 assertions). TypeScript and scoped CRLF-aware Biome passed. Direct source build and compiled CLI/browser smoke passed; runtime surface has zero drift. Backup, upstream and mini refs are created. Default and ruleset await current migration PR checks.

PR #21 merged at 6982bb2175e6859c2646ddee8221f52299462961 after all six checks passed on reviewed head 4df32622 (run 37169389002, attempt 3); code/security and CodeRabbit reviews completed without actionable findings. Actual compiled runtime reports have zero drift on Linux, macOS and Windows. Default mini and repository ruleset 24454494 are now applied; inherited organization ruleset 15682536 is preserved. Effective branch rules match all six exact contexts/app 15368 with strict up-to-date checks and merge-commit-only PR integration. Main remains 92fa4940; upstream remains pristine fd20f714; all remote tag targets match preflight and both upstream and demonstration merge ancestry are retained. A subsequent PR verifies required-check enforcement before final closure. Timestamp flake #16 remains separate.

Final verification: issue #14 closed after effective-rule checks and PR #22 returned all six checks as required (CheckRun.isRequired true for each emitted context). Applied decision and rollback IDs are durable at https://github.com/glitchwerks/mini-backlog.md/issues/14#issuecomment-5979716407. BACK-698 acceptance criteria and DoD are verified by the prior retained candidate, reviewed migration PR #21 and its full Linux type/format/test/TUI jobs plus all three compiled platform/runtime jobs. The completed plan is retired only after its parent issue closes, with the committed reference redirected. PR #22 contains the final record and must pass its own required checks before merging. No code simplification is needed: one CI branch trigger and the existing ruleset provide the migration; no new product layers were added. The historical timestamp flake remains open in #16. Optional future PR-filter guard remains deferred.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Dedicated branches applied: mini is default, upstream is pristine fd20f714, main/backup remain 92fa4940, and tags/history are preserved. Repository ruleset 24454494 enforces six exact up-to-date GitHub Actions checks and merge-commit PRs; inherited ruleset 15682536 is unchanged. PR #21 passed all six jobs; Linux/macOS/Windows runtime reports show zero drift, 15 local source/package/install contracts passed, and CLI/browser smoke passed. PR #22 confirms all six emitted checks are required. Parent #14 is closed; durable rationale/rollback are on the issue and the completed plan is retired. #16 remains separately open.
<!-- SECTION:FINAL_SUMMARY:END -->
