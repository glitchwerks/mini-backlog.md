---
id: BACK-701
title: Smoke-test the installed CLI project and entity workflow
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 12:44'
updated_date: '2026-10-04 13:16'
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
- [x] #4 Runs the installed workflow in all three platform CI suites and documents a focused local command
- [x] #5 Bounds subprocesses and cleans up its installation and project
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun run check . passes when formatting/linting touched
- [x] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Extended the existing offline npm pack/install fixture through its installed npm launcher. Initial expanded run passed 8 tests; final local verification passed 14 tests / 89 assertions including source-only distribution and package-bin guards. TypeScript and scoped CRLF-aware Biome passed. A temporary fault injected only into the disposable installed launcher made doc update return success without persisting changes; the new document read-back assertion failed as expected. The exact test file was restored before green verification. README documents the focused command. Platform profile includes the installed workflow; cross-platform CI and repository-wide format check remain pending.

CI run 37203607977 at 85918d56 proved the installed workflow on Linux (21.7 s), macOS (13.1 s), and Windows (38.3 s). Repository-wide Biome and TypeScript passed on Linux; all three compiled smoke/surface jobs passed. The sole broader Linux failure was the pre-existing board timestamp comparison at src/test/cli-doc-decision-board.test.ts:506, recorded on issue #16. Independent code review found no actionable issues. Final metadata commit receives fresh required CI before merge.

Addressed PR #26 review feedback by invoking npm-generated node_modules/.bin/backlog.cmd on Windows or backlog on POSIX for every workflow step. Shared subprocess helper now terminates the exact Windows process tree or isolated POSIX process group; a real descendant-output timeout regression test protects pipe cleanup. Portable single-line Markdown verifies document persistence through the Windows command shim. Negative probes caught a missing npm shim, a hung installed command, and a success-without-persistence document update; restored fixtures passed 15 focused tests / 91 assertions, TypeScript, and scoped Biome. Updated independent review found no actionable issues. Fresh final-head CI is required before merge; both earlier full Linux failures were the same timestamp flake in #16.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: @codex
created: 2026-10-04 12:45
---
Extend the existing offline npm installation fixture with a Git-backed installed-launcher journey and CLI read-backs. Include this file in the platform CI profile and document the focused test command.
---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added offline installation smoke through npm-generated backlog/backlog.cmd: Git-backed project initialization, shipped directions, task creation/editing, milestone rename, and document creation/update with persisted CLI read-backs. Uses a temporary prefix and disposable project, with bounded process-tree cleanup and a real timeout regression test. Included the file in all three platform CI suites and documented the focused command. Local 15 tests / 91 assertions, TypeScript, and scoped lint passed; injected missing-command, hung-command, and lost-update faults were detected. Earlier installed-launcher workflow passed Linux/macOS/Windows; final generated-command revision receives fresh CI before merge. Existing board timestamp flake remains tracked in #16.
<!-- SECTION:FINAL_SUMMARY:END -->
