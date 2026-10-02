---
id: BACK-689
title: 'Restore mini CLI init, instructions, and flag parity'
status: Done
assignee:
  - '@codex'
created_date: '2026-10-02 01:43'
updated_date: '2026-10-02 11:53'
labels: []
dependencies: []
type: bug
ordinal: 320000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mini cannot create a new Backlog.md project or read the canonical workflow guides, and its help strips production short aliases from otherwise permitted options. This leaves new users unable to initialize and makes mini command usage drift from the production CLI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Mini exposes the full production `backlog init` command and initialization behavior
- [x] #2 Mini exposes `backlog instructions` with overview, task lifecycle, and init-required guides
- [x] #3 Every option permitted by mini retains the corresponding production short aliases and help spelling
- [x] #4 Commands and options outside the approved mini surface remain unavailable
- [x] #5 README documents initialization, instruction guides, and supported option aliases
- [x] #6 Regression tests cover initialization, instruction output, help parity, and fail-closed restrictions
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add failing mini CLI integration and policy tests for full init, all workflow guides, production short aliases, and continued rejection of excluded commands/options. 2. Extend the explicit mini command/option allowlist for init and instructions, then preserve Commander short flags and help spelling for allowed options. 3. Update README installation and restricted-surface documentation. 4. Run focused tests, the complete test suite, type-checking, formatting/lint checks, and compiled smoke verification; simplify the policy implementation after it is green.

5. Add regression coverage for mini-specific lifecycle instructions, transform every exposed guide to remove unsupported commands and options while keeping full init behavior, correct the compiled-entry formatting regression, and re-run focused/CI-equivalent verification before updating the PR branch.

6. Add a failing regression assertion for the mini overview task-creation decision rule, restore the concise rule in the central mini overview guide, then re-run focused instruction/surface tests, TypeScript, and targeted Biome before finalizing this review follow-up.

7. Add test-first functional coverage for non-interactive mini init defaults, mini-safe Claude agent installation, and mini-safe MCP client guidance; select integration templates from the active runtime mode while preserving production templates and full init behavior; run focused integration/surface/full-mode regression verification and CI-equivalent checks before updating PR #7.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline before implementation: the focused mini CLI suite passed 58/58. The repository-wide Windows suite was stopped after reproducing unrelated pre-existing failures in src/test/board-tui-move.test.ts (multiple move persistence/timing cases and one cross-screen TUI error) and src/test/claude-agent-install.test.ts (project-manager agent content assertion). These files are outside BACK-689 scope; focused mini tests are the clean comparison baseline.

Verification: 110 mini behavior and package tests passed across 9 files; TypeScript validation passed; the compiled build and browser/init/instructions smoke passed; independent review found no issues. Baseline exceptions retained: mini-source-distribution has one CRLF-sensitive Windows regex failure, repository-wide tests have unrelated board/Claude-agent failures, and repository-wide Biome reports existing CRLF working-tree diagnostics. DoD #2 remains unchecked because the exact repository-wide check does not pass on this Windows baseline.

Baseline exception: the Nix package smoke currently fails during 'nix build' because the browser binary cannot find the bundled '../web/index.html'. Per user direction, this is recorded only and remains outside this fix.

PR review follow-up: added mini-specific text for all five instruction guides through one central override map, with test-first coverage proving each guide uses only the restricted command/option surface and still provides a usable lifecycle. Verification: mini CLI 63/63 passed; full production CLI guidance 16/16 passed; broader mini behavior/package coverage 119 passed with the same CRLF-sensitive mini-source-distribution test failing on Windows; compiled build/package/browser smoke 8/8 passed; the project-local TypeScript compiler passed; and every changed TypeScript file passed LF-normalized Biome validation. The exact repository-wide Biome check still reports 443 CRLF working-tree diagnostics, so DoD #2 remains unchecked.

PR #7 decision-rule follow-up: test-first coverage failed on the missing mini overview guidance, then passed after restoring a concise substantive-work versus question/lookup/mechanical-change rule in the central mini overview. Verification: 80/80 focused mini-surface and full production-guidance tests passed; targeted Biome passed for both changed TypeScript files; and the project-local TypeScript compiler passed via bun node_modules/typescript/bin/tsc --noEmit. One intermediate mini surface run exceeded the existing decision-search timeout by 12 ms; the exact rerun passed in 8.74 s. The exact repository-wide Biome baseline still reports 441 Windows CRLF diagnostics, so DoD #2 remains unchecked. The bunx TypeScript shim remains locally corrupted even after a forced install, but the same project TypeScript dependency and tsconfig passed when invoked directly.

New unrelated CI baseline observed during PR #7 follow-up: the latest Ubuntu run failed only src/test/cli-doc-decision-board.test.ts on the board default-versus-view output comparison while 2701 tests passed. That file is untouched by this follow-up, and the new commit will rerun CI. The previously recorded Nix/browser and other baseline exceptions remain unchanged.

PR #7 init-integration follow-up RED: the new tests exposed all three review findings: the init-required guide lacked a fully prompt-free command, mini init installed the production Claude template with excluded operations, and mini MCP guidance referenced unavailable workflow resources/tools. GREEN: centralized runtime-selected integration guidance now preserves the exact production templates while mini installs only allowlisted Claude/MCP guidance; the documented prompt-free command initializes a fresh directory. Verification: the 3 new regressions passed; the broader init/guidance suite passed 134 tests with 1 Windows symlink skip and 0 failures; the mini contract suite passed 45/45; the project TypeScript compiler, targeted Biome, direct build, and compiled smoke passed. Baselines retained: exact repository-wide Biome still reports 441 Windows CRLF diagnostics, the Bun package-bin shim remains locally corrupted, the unchanged Windows Claude symlink fixture remains materialized as link text, the latest Ubuntu run has only the recorded board timestamp comparison failure after 2701 passes, and the recorded Nix browser-asset failure remains. DoD #2 remains unchecked.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Kept the mini CLI/MCP restricted while replacing every exposed workflow guide with concise mini-compatible guidance; full production guides and init behavior remain unchanged. Added regression coverage for all guides and fixed the Ubuntu compiled-entry formatting failure. Verified with 63 mini CLI tests, 16 full guidance tests, 119 broader mini tests plus the documented Windows-only CRLF failure, 8 compiled/package smoke tests, TypeScript, and targeted Biome.

Restored the mini overview task-creation decision rule requested in PR #7 review without changing other mini guides or the production guides. Added a regression test and verified 80/80 focused tests, targeted Biome, and TypeScript.

Aligned mini init integrations with the restricted surface: init-required now gives a genuinely prompt-free command, mini Claude installation advertises only allowed CLI operations, and mini MCP guidance lists only shipped mini tools. Full production templates and init behavior remain unchanged. Added functional regressions and updated compiled smoke coverage.
<!-- SECTION:FINAL_SUMMARY:END -->
