---
id: BACK-694
title: Capture CLI and MCP surfaces from running Backlog builds
status: Done
assignee:
  - '@codex'
created_date: '2026-10-03 13:00'
updated_date: '2026-10-03 13:26'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/10'
type: enhancement
ordinal: 322000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Execution record for GitHub issue #10 in milestone #1. Capture the CLI and MCP surface from a selected build without Git or internal full-mode imports.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Capture complete CLI help and paginated MCP discovery as deterministic versioned JSON.
- [x] #2 Launch failures, timeouts, and malformed discovery fail without partial manifests.
- [x] #3 Tests cover edge cases and real mini discovery; README documents usage.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Implement GitHub #10 with failing tests first, external-process CLI and MCP discovery, repeatability and cleanup checks, documentation, and a scoped PR against the initiative branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented external-process CLI help traversal and paginated MCP discovery with canonical JSON, atomic publication, explicit targets, failure handling, process cleanup, and documentation. Review findings for malformed help, SIGTERM-resistant timeout handling, and eager SDK output-schema compilation were reproduced and fixed; follow-up review found no actionable findings. Real source captures and compiled captures are byte-identical; compiled inventory contains 24 command entries and 15 MCP tools. Type check and focused CRLF-aware Biome checks pass. Build succeeds via bun scripts/build.ts; bun run build encounters a dependency-local Bun launcher remap error in this environment. Existing mini CLI excluded-decision search test timed out before implementation and again in isolation; other baseline CLI cases passed. POSIX SIGTERM-resistant test is skipped on Windows. Whole-repository formatting is not claimed; prior PR #9 records existing CRLF formatting diagnostics.

Final verification: 32 discovery/MCP tests passed, 1 POSIX-only skip; type check, focused CRLF-aware formatting, production build, and compiled CLI/browser smoke passed. Two captures within each of the source and compiled modes produce identical bytes. Whole-tree CRLF-aware Biome check reports one unchanged src/utils/task-builders.ts diagnostic, matching PR #9 baseline. Final independent review reports no actionable findings.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added runtime CLI/MCP discovery tooling for GitHub #10, verified deterministic external and real mini captures, paginated schemas, failure publication rules, and process cleanup. Documentation includes explicit target format and limits. Ready for initiative-branch review; baseline approval, comparison, response probes, CI gating, and branch migration remain tracked in #11-14.
<!-- SECTION:FINAL_SUMMARY:END -->
