---
id: BACK-687
title: Create fail-closed restricted CLI and MCP surface
status: In Progress
assignee:
  - '@codex'
created_date: '2026-09-15 00:10'
updated_date: '2026-09-15 00:11'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/1'
type: feature
ordinal: 318000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Limit mini-backlog.md to task, document, and milestone management so agents cannot discover or invoke unrelated Backlog.md capabilities and do not need prompt instructions to avoid them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLI exposes only help, version, MCP startup, and approved task, document, and milestone operations
- [ ] #2 MCP exposes only approved task, document, and milestone tools with no workflow or Definition-of-Done resources or tools
- [ ] #3 Task inputs and outputs expose only the approved task fields while preserving hidden metadata during permitted edits
- [ ] #4 Task and milestone archive operations and all due-date fields are unavailable
- [ ] #5 Exact-surface tests keep future upstream commands, tools, options, and fields hidden by default
- [ ] #6 README identifies mini-backlog.md and documents its restricted surface
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->
