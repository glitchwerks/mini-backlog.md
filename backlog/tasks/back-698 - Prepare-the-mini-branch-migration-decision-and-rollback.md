---
id: BACK-698
title: Prepare the mini branch migration decision and rollback
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-03 17:19'
updated_date: '2026-10-03 17:33'
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
- [ ] #3 Repository administration is applied only after the concrete migration decision required by issue #14.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Inventory current refs and worktrees (PR #15 closure and main 1b369ba5), build an isolated candidate from upstream fd20f714 with the current mini implementation, verify equivalent runtime surface, then record additive upstream/mini/default/required-check migration and rollback in docs/. Leave main and tags intact until the decision required by #14.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prepared an additive branch/default/PR-base/CI/install/tag migration and rollback proposal with verified sources and a concrete required-check ruleset payload. The selected upstream fd20f714 is already an ancestor of mini main. Disposable upstream-first merge bc1134f26c5226460c2cd5efd5d7875bbfbf2c6d has parents fd20f714 and cde1f7c5; its tree equals mini implementation 2481625603fe65392bf1e089cc6c7f0fa0a0e325. Built from that checkout with frozen isolated dependencies; compiled runtime capture has zero drift, CLI/browser smoke passes. Merge retained in initiative history via fast-forward. Snapshot and report are persisted in docs/surfaces/reports/upstream-based-candidate.*. This demonstration does not predict conflict-free future syncs. Current remote default/branches/tags/ruleset and local worktrees inventoried. Admin changes and publication remain pending the concrete #14 decision and clarification of unmerged PR #15 closure. No remote branch/default/tag/ruleset migration has been applied.

Independent review found no actionable proposal, evidence, citation or ruleset schema errors. All seven proposed check contexts and GitHub Actions app 15368 were verified against PR #15 check-runs. Candidate snapshot equals the baseline; report identity matches the retained merge. The three clean temporary capture/demo worktrees were removed after explicit path and status checks; active and unrelated worktrees remain. The required-check payload is a review proposal, not an applied ruleset.

Persistence audit after commit 9ccb5069: git ls-tree HEAD -- docs/surfaces verifies the inventory, proposed ruleset, upstream-based candidate snapshot and both reports; git ls-tree HEAD -- docs/superpowers/plans/2026-10-03-mini-branch-migration-plan.md verifies the proposal. All six required migration artifacts are committed. The earlier 18 capture/comparison/gate artifacts are also present in HEAD. git merge-base --is-ancestor bc1134f26c5226460c2cd5efd5d7875bbfbf2c6d HEAD succeeds. Deliverables reconcile with git diff main...HEAD --stat. Implementation branch is local and unpublished after baf842ef pending the PR #15 closure clarification.
<!-- SECTION:NOTES:END -->
