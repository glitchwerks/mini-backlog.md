---
id: BACK-697
title: Gate mini synchronization with runtime surface comparison
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 17:08'
updated_date: '2026-10-04 01:07'
labels: []
dependencies:
  - BACK-696
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/13'
ordinal: 325000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the runtime surface sync review gate scoped by GitHub issue #13; GitHub remains the source of truth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A compiled candidate is captured in an isolated fixture and compared against the reviewed baseline without changing it.
- [x] #2 CI preserves candidate and comparison artifacts and fails on unexpected surface drift.
- [x] #3 README documents the three runtime comparisons and preserved merge ancestry.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
First extract the existing disposable fixture lifecycle without changing behavior (scripts/surface-manifest.ts, BACK-695). Then add a compiled-binary gate and failure/readonly tests, wire it into the existing compile workflow, and document the sync flow (issues #12 and #13). Review and verify before pushing.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
The compiled-binary check and CI wiring are implemented and independently reviewed with no remaining actionable findings. Final focused verification: 56 pass, 2 POSIX-only skips, 0 fail; TypeScript and scoped CRLF-aware Biome pass. Actual compiled mini has zero drift; a deliberate required-schema change exits 1, writes artifacts and preserves baseline hash. A fresh frozen isolated dependency install also produces zero drift. zod 4.4.3 is now declared directly; bun2nix regeneration changes no content. CI upload includes narrowly scoped hidden candidate artifacts. Remote CI publication is pending clarification because PR #15 was closed without merge and its primary branch deleted. Required check ruleset enforcement remains a concrete proposal for #14; this task is not finalized. Existing full-suite/whole-tree formatting and Linux/Nix CI problems remain tracked in #16.

Publication resumed with user approval. Replacement PR #17 targets the restored codex/mini-surface-sync branch and publishes fc0800b6. Run 37151883658 uploaded mini-runtime-surface artifacts for Linux, macOS and Windows. Compile-job outcomes are checked separately; remaining full-suite/Nix and repository ruleset enforcement still prevent final integration.

Issue #18 retires the optional Nix lane by user decision. The updated #14 ruleset proposal requires six contexts (three compile/runtime checks and three unit jobs). Historical Nix evidence remains in #16; its active scope is Linux board-output investigation. Permanent ruleset activation remains pending.

Final integration: PR #19 merged into main as 5e38dda16be939bfb21872592c068680cef21a85 and closed GitHub issue #13. Run 37165864478 on reviewed head 92529920 passed all six jobs, including Linux type/format checks, the full suite and interactive TUI regressions, and Linux/macOS/Windows compile, CLI/browser smoke and runtime-surface checks; all three runtime candidate/report artifacts were uploaded (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37165864478). The cleanup-only PR #20 run 37166561548 on 3bdb3ad1 also passed all six jobs (https://github.com/glitchwerks/mini-backlog.md/actions/runs/37166561548). These results complete the remaining formatting DoD and supersede the earlier pending publication/integration entries. The prior compiled zero-drift and deliberate-drift rejection results remain the baseline-preservation evidence. Permanent branch/default/ruleset administration remains pending the separate user decision in #14; it is outside this completed gate task.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated the compiled runtime-surface synchronization gate, preserved candidate/comparison artifacts and documented the three-comparison review flow through PR #19 (5e38dda16be939bfb21872592c068680cef21a85), closing #13. Verification: compiled zero drift and deliberate drift exit 1 with baseline unchanged, 56 focused tests passed (2 platform skips), and all six jobs passed in runs 37165864478 and 37166561548, including Linux formatting/types/full suite and three-platform compile/smoke/runtime checks. Permanent branch/default/ruleset administration remains a separate decision in #14.
<!-- SECTION:FINAL_SUMMARY:END -->
