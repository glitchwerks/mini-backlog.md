---
id: BACK-690
title: Synchronize upstream v1.53.0
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-02 16:17'
updated_date: '2026-10-02 16:32'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/8'
ordinal: 321000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track GitHub issue #8: incorporate the upstream v1.53.0 release while retaining the mini CLI/MCP contract and source-only release policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Upstream release changes are integrated and fork task history is preserved
- [x] #2 Mini CLI/MCP and installed guidance regressions pass
- [x] #3 Version 1.53.0 type-check, build, compiled smoke, and tag validation pass
- [ ] #4 A focused PR links issue #8 and records established baseline failures
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Merge upstream release fd20f714 (v1.53.0) into the isolated branch based on fork main 9a99f1c8 (issue #8). 2. Preserve mini-specific CLI/init, launcher, JSON projections, browser and packaging in merge resolutions (README.md; PR #7). 3. Use doctor preview and supported duplicate-ID repair to retain overlapping upstream/fork task history; record any reference mappings (upstream BACK-687..689; fork PRs #2/#6/#7). 4. Match the published version 1.53.0 (upstream release URL in issue #8; tagged package.json still 1.52.0), extend surface regressions for newly excluded options, and run upstream watcher/list plus mini suites. 5. Verify TypeScript, targeted Biome, source-only build, compiled browser smoke and mini-v1.53.0 tag validation; commit and open PR closing #8 (README.md Upstream synchronization).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Duplicate-ID repair verified no remaining active/completed collisions. Upstream pagination BACK-687 -> BACK-691; upstream watcher lifetime BACK-688 -> BACK-692; fork init/instructions PR #7 BACK-689 -> BACK-693; upstream idle CPU task retains BACK-689. Reviewed the two ambiguous reference lines: historical fork notes are clarified on BACK-693; the plan original upstream IDs identify pre-sync records. Existing branches are diagnostic-only and were not modified.

Verification: 122 mini CLI/MCP/task contract tests passed; 51 additional packaging/compiled entry/browser/installed guidance/init tests passed with 1 established Windows skip. TypeScript, source-only build, compiled CLI/browser smoke and mini-v1.53.0 tag validation passed. New upstream paging options remain rejected by mini, and JSON paging metadata is full-mode only. Source-only launcher watcher lifetime test passed. Fixed imported pagination test cleanup after reproducing Bun retaining process.exitCode=1 when restored to undefined; 8 unit tests now exit 0. Exact repository-wide Biome reports 453 diagnostics on this CRLF working tree; unrelated existing task-builders.ts is also reported by a CRLF-aware whole-tree probe. All changed TypeScript files receive scoped CRLF-aware validation. DoD #2 remains unchecked. Prior Ubuntu board comparison and Nix browser-asset failures remain recorded baselines, not fixes. Full suite and independent merge review are in progress. Published upstream release is v1.53.0 even though its tagged package.json still says 1.52.0; fork package follows published release.

Release verification rerun: 41 upstream pagination/watcher/launcher tests passed with 2 platform skips and exit 0 after runner cleanup correction; all 13 changed TypeScript files passed CRLF-aware Biome. Full bun run test was stopped after reproducing recorded board-tui-move.test.ts move persistence/cross-screen failures and claude-agent-install.test.ts link-text fixture failure, plus cli-browser-port.test.ts Windows EBUSY cleanup. Board failing cases: selected Enter move, M confirmation, whole-set move, second-Enter collapse, cross-column order, Escape during write, and per-task partial failure; an unhandled move persistence error also occurred. No fixes to those unrelated baselines were attempted.
<!-- SECTION:NOTES:END -->
