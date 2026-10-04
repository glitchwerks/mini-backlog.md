---
id: BACK-701
title: Smoke-test the installed CLI project and entity workflow
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-04 12:44'
updated_date: '2026-10-04 12:51'
labels: []
dependencies: []
references:
  - 'https://github.com/glitchwerks/mini-backlog.md/issues/25'
ordinal: 329000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Issue #25: Extend the locally installed package test to initialize a Git-backed project, read instructions, and create/edit tasks, milestones, and documents through the installed launcher.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Installs the real local package in a temporary prefix without registry or global installation changes
- [x] #2 Initializes a disposable Git project and reads shipped workflow instructions through the installed CLI
- [x] #3 Creates and edits a task, renames a milestone, and creates and updates a document with CLI read-back assertions
- [ ] #4 Runs the installed workflow in all three platform CI suites and documents a focused local command
- [x] #5 Bounds subprocesses and cleans up its installation and project
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extended the existing offline npm pack/install fixture through its installed npm launcher. Initial expanded run passed 8 tests; final local verification passed 14 tests / 89 assertions including source-only distribution and package-bin guards. TypeScript and scoped CRLF-aware Biome passed. A temporary fault injected only into the disposable installed launcher made doc update return success without persisting changes; the new document read-back assertion failed as expected. The exact test file was restored before green verification. README documents the focused command. Platform profile includes the installed workflow; cross-platform CI and repository-wide format check remain pending.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-10-04 12:45
---
Extend the existing offline npm installation fixture with a Git-backed installed-launcher journey and CLI read-backs. Include this file in the platform CI profile and document the focused test command.
---
<!-- COMMENTS:END -->
