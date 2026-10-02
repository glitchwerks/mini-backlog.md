---
id: BACK-689
title: 'Restore mini CLI init, instructions, and flag parity'
status: Done
assignee:
  - '@codex'
created_date: '2026-10-02 01:43'
updated_date: '2026-10-02 02:22'
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
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline before implementation: the focused mini CLI suite passed 58/58. The repository-wide Windows suite was stopped after reproducing unrelated pre-existing failures in src/test/board-tui-move.test.ts (multiple move persistence/timing cases and one cross-screen TUI error) and src/test/claude-agent-install.test.ts (project-manager agent content assertion). These files are outside BACK-689 scope; focused mini tests are the clean comparison baseline.

Verification: 110 mini behavior and package tests passed across 9 files; TypeScript validation passed; the compiled build and browser/init/instructions smoke passed; independent review found no issues. Baseline exceptions retained: mini-source-distribution has one CRLF-sensitive Windows regex failure, repository-wide tests have unrelated board/Claude-agent failures, and repository-wide Biome reports existing CRLF working-tree diagnostics. DoD #2 remains unchecked because the exact repository-wide check does not pass on this Windows baseline.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored full project initialization and all canonical instruction guides in mini, preserved production short aliases for every allowed option, and kept excluded commands fail-closed. Verified with 110 passing mini tests, TypeScript validation, compiled build/smoke, and independent review; unrelated Windows baseline failures are documented in Implementation Notes.
<!-- SECTION:FINAL_SUMMARY:END -->
