---
id: BACK-688
title: Restore the full upstream browser interface
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-19 23:30'
updated_date: '2026-09-20 00:35'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/5'
type: feature
ordinal: 319000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Restore the complete upstream browser to mini-backlog.md while keeping every other CLI and MCP restriction intact. The browser must operate through its local HTTP API and shared core behavior without depending on hidden CLI commands, MCP registration, or MCP-only implementation modules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The mini CLI exposes the browser command with the upstream port and no-open options
- [ ] #2 The complete upstream browser UI and API work without mini-specific filtering
- [ ] #3 The browser and server do not import from CLI, command, or MCP modules
- [ ] #4 Shared milestone mutations and domain errors are reused through the shared core boundary
- [ ] #5 All other mini CLI and MCP surfaces remain restricted
- [ ] #6 Source builds and installed packages include browser assets and launch successfully
- [ ] #7 Tests cover the exact surface, browser launch, representative browser API behavior, and dependency boundaries
- [ ] #8 README documents the browser command and full-surface exception
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Baseline before product changes: dependency install was repaired after an interrupted sandboxed install left the local Bun shim incomplete. The untouched full test suite then exposed existing Windows/environment failures in TUI move timing and screen isolation, inherited Claude-agent fixture resolution, browser/doctor temporary-directory cleanup locks, and sandbox-denied repository lock creation. The run was stopped after the same unrelated failure classes repeated. No product code or design document had been changed.
<!-- SECTION:NOTES:END -->
