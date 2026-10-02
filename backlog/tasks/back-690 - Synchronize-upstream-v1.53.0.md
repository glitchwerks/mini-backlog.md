---
id: BACK-690
title: Synchronize upstream v1.53.0
status: Done
assignee:
  - '@codex'
created_date: '2026-10-02 16:17'
updated_date: '2026-10-02 17:52'
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
- [x] #4 A focused PR links issue #8 and records established baseline failures
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

PR9 watcher follow-up: reproduce root backlog.config.yml backlog_directory switching with a failing functional watch test; re-resolve watcher directories and stat inputs only on refresh; verify new-directory edits/additions/removals, missing directories, cleanup and idle stat-only behavior. Sources: src/cli.ts:L3068-L3090; src/commands/watch-json.ts:L135-L160; https://github.com/glitchwerks/mini-backlog.md/pull/9#discussion_r4167786294 (fetched 2026-10-02).

PR9 root-config creation follow-up: reproduce adding a previously absent root config during watch startup from folder-local config, then subscribe nonrecursively to project root and stat the root-config candidate using DEFAULT_FILES.ROOT_CONFIG. Keep task-directory inputs unchanged and avoid scanning root contents. Reverify watcher lifecycle, mini surface and compiled smoke. Sources: src/cli.ts:L3068-L3093; src/utils/backlog-directory.ts:L209-L217; src/constants/index.ts:L40; https://github.com/glitchwerks/mini-backlog.md/pull/9#discussion_r4168165425 (fetched 2026-10-02).

PR9 pagination follow-up: reproduce full CLI Next footer when ancestor --plain occurs between --search and literal --skip; verify Commander ancestor parsing before minimal reconstruction fix. Add unit coverage for ancestor boolean/required/optional/negated flags, repeated flags, aliases, inline values and separator; execute actual footer to preserve filters/window. Sources: src/utils/list-window.ts:L27-L31,L115-L118,L177-L202; src/test/cli-list-window.test.ts:L204-L218; https://github.com/glitchwerks/mini-backlog.md/pull/9#discussion_r4168247311 (fetched 2026-10-02).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Duplicate-ID repair verified no remaining active/completed collisions. Upstream pagination BACK-687 -> BACK-691; upstream watcher lifetime BACK-688 -> BACK-692; fork init/instructions PR #7 BACK-689 -> BACK-693; upstream idle CPU task retains BACK-689. Reviewed the two ambiguous reference lines: historical fork notes are clarified on BACK-693; the plan original upstream IDs identify pre-sync records. Existing branches are diagnostic-only and were not modified.

Verification: 122 mini CLI/MCP/task contract tests passed; 51 additional packaging/compiled entry/browser/installed guidance/init tests passed with 1 established Windows skip. TypeScript, source-only build, compiled CLI/browser smoke and mini-v1.53.0 tag validation passed. New upstream paging options remain rejected by mini, and JSON paging metadata is full-mode only. Source-only launcher watcher lifetime test passed. Fixed imported pagination test cleanup after reproducing Bun retaining process.exitCode=1 when restored to undefined; 8 unit tests now exit 0. Exact repository-wide Biome reports 453 diagnostics on this CRLF working tree; unrelated existing task-builders.ts is also reported by a CRLF-aware whole-tree probe. All changed TypeScript files receive scoped CRLF-aware validation. DoD #2 remains unchecked. Prior Ubuntu board comparison and Nix browser-asset failures remain recorded baselines, not fixes. Full suite and independent merge review are in progress. Published upstream release is v1.53.0 even though its tagged package.json still says 1.52.0; fork package follows published release.

Release verification rerun: 41 upstream pagination/watcher/launcher tests passed with 2 platform skips and exit 0 after runner cleanup correction; all 13 changed TypeScript files passed CRLF-aware Biome. Full bun run test was stopped after reproducing recorded board-tui-move.test.ts move persistence/cross-screen failures and claude-agent-install.test.ts link-text fixture failure, plus cli-browser-port.test.ts Windows EBUSY cleanup. Board failing cases: selected Enter move, M confirmation, whole-set move, second-Enter collapse, cross-column order, Escape during write, and per-task partial failure; an unhandled move persistence error also occurred. No fixes to those unrelated baselines were attempted.

Independent read-only merge review found no actionable defects. Release ancestry and committed artifact persistence verified. PR #9 opened with Closes #8 and all verification/baseline details: https://github.com/glitchwerks/mini-backlog.md/pull/9. Implementation is ready for review; merge and mini-v1.53.0 tag publication remain separate post-review actions.

PR9 review intake: one unresolved watcher P2 thread; six platform jobs passed at 36e70f. Parent independently verified Nix missing ../web/index.html failure and user explicitly accepted retaining that baseline; leave Nix unchanged.

PR9 watcher review reproduction: root config switched backlog_directory to a missing replacement directory and emitted an empty list, but subsequent TASK-2 creation timed out waiting for a matching JSON snapshot before the fix. Fixed one-time watch paths by resolving current filesystem paths before each refresh and replacing subscriptions when changed; only ENOENT is tolerated for missing target directories, with stat reconciliation discovering creation. Replaced watcher errors cannot terminate the active watch. Idle passes remain stat-only. Regression covers root-config switch, missing/empty target, new-path edits/additions/removals, obsolete subscriptions, and changes during blocked initial read. Final watcher run: 18 pass, 1 Windows symlink skip, 0 fail; check:types and CRLF-aware scoped Biome passed. Source-only build and independent compiled CLI/browser/MCP smoke passed. Broader 10s mini run: 137 pass, 1 platform skip, 2 failures: excluded decision search timeout and source-tag workflow regex against CRLF. Exact decision-search test passed at 20s in 13.2s; 20s contract rerun in progress. Workflow and distribution test diff against 36e70f is empty. Accepted Nix missing embedded ../web/index.html remains unchanged.

Independent reviewer returned ready with no actionable findings; parent independently reran root-config and concurrent-read regressions (2 pass, 0 fail) and TypeScript successfully. Broader 20s mini contract rerun: 126 pass, 1 platform skip, 1 timeout in rejects the excluded decision search type (20.015s), despite standalone same test passing at 13.2s. Running isolated full mini-cli-surface suite with local 60s allowance; no production timeout or test configuration changed.

Isolated full mini-cli-surface rerun with local --timeout=60000: 88 pass, 0 fail; excluded decision search completed in 14.637s. All other contract suites passed in the prior combined run (126 pass with only that timeout and 1 platform skip). No test configuration was changed. Independent review ready; parent regressions/type-check passed. Review delta is ready for parent push/review coordination; full-tree CRLF lint, unrelated Windows tests and accepted Nix exception remain documented, DoD #2 remains unchecked.

Second PR9 watcher feedback reproduced after settling startup notifications: creating previously absent root backlog.config.yml timed out awaiting changed list, while preexisting-root case passed. Fix adds project-root nonrecursive subscription and stat input join(cwd, DEFAULT_FILES.ROOT_CONFIG); periodic signature never reads/scans repository contents. Parameterized functional regression covers both root-config creation and modification, then replacement-directory create/edit/add/remove and obsolete path suppression. GREEN: 19 watcher tests passed, 1 Windows symlink skip; TypeScript and scoped CRLF-aware Biome passed. Full mini CLI surface --timeout=60000 passed all 88 tests (excluded decision search 16.977s); source-only build and independent compiled CLI/browser/MCP smoke passed. Accepted Nix missing ../web/index.html and prior unrelated baselines remain unchanged. DoD #2 remains unchecked.

Root-config creation delta independent review returned ready with no findings. Parent independently reran both root-config functional cases to completion: 2 pass, 0 fail, exit 0 (11.17s).

Third PR9 feedback RED: actual full task list --search --plain --skip --status To Do --max-count 1 matched three filtered tasks, but executing footer Next produced two windows and changed query/window. Commander removes ancestor --plain before child consumes literal --skip; adding ancestor valueFlags alone would not solve it. Fix tracks ancestor-consumed argv indices then preserves those tokens/order while finding child option operands, replacing only true pagination skip. Actual Commander equivalence unit cases cover nested ancestors, repeated boolean flags, required operand named --skip, short alias/attached value, long inline value, optional operands including negative numbers and digit-short exclusion, negated flags, child inline values resembling parent flags, and literal --. Functional footer replay verifies identical filters/status/page-size and complete three-window result. Mini pagination remains excluded; 15 paging rejection tests passed. TypeScript/scoped CRLF Biome passed; final 22 upstream unit/integration rerun in progress. No CLI source or public surface changes; accepted Nix exception retained.

Final pagination verification: 22 upstream unit/full-CLI integration tests passed with 192 assertions, 0 failures; final explicit numeric-short boundary unit rerun passed 9 tests with 113 assertions. 15 mini paging rejection tests passed. TypeScript, scoped CRLF-aware Biome, and git diff --check passed. Independent reviewer confirmed optional-negative mismatch resolved and returned ready with no actionable findings; parent independently passed 9 unit tests/113 assertions and TypeScript and inspected diff. No CLI/public allowlist changes; accepted Nix missing embedded asset and prior unrelated baselines remain unchanged, DoD #2 remains unchecked.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Integrated upstream v1.53.0 while preserving mini restrictions, full init/instructions, browser and source-only launcher. Preserved both task histories through supported ID repair. Verified 122 mini contract tests, 51 broader tests, 41 release tests, TypeScript, scoped Biome, compiled/browser smoke and tag validation; documented full-suite Windows baselines. Submitted PR #9 closing issue #8.

Addressed PR9 watcher reconfiguration feedback: paths and subscriptions now follow changed root backlog configuration while idle reconciliation remains stat-only. Verified failing functional reproduction then 18 watcher passes/1 platform skip, 88 mini CLI surface passes, remaining contract suites, TypeScript, scoped CRLF Biome, source-only build and independent compiled CLI/browser/MCP smoke. Recorded unchanged CRLF workflow test and variable local decision-search timeouts; Nix exception retained.

Handled newly created root config during JSON watch: always subscribe to project-root notifications and stat root-config candidate; verified RED/GREEN absent/present-root regression, 19 watcher passes/1 skip, 88 mini surface passes, TypeScript/Biome and compiled CLI/browser/MCP smoke.

Fixed full CLI pagination footer reconstruction when ancestor flags occur between child options and operands. Verified actual failing footer replay then 22 upstream paging passes, 15 mini paging rejection passes, TypeScript/Biome, independent review and parent unit verification. Ancestor flag order/values and literal query --skip are preserved while pagination advances.
<!-- SECTION:FINAL_SUMMARY:END -->
