---
id: BACK-687
title: Create fail-closed restricted CLI and MCP surface
status: Done
assignee:
  - '@codex'
created_date: '2026-09-15 00:10'
updated_date: '2026-09-16 13:12'
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
- [x] #1 CLI exposes only help, version, MCP startup, and approved task, document, and milestone operations
- [x] #2 MCP exposes only approved task, document, and milestone tools with no workflow or Definition-of-Done resources or tools
- [x] #3 Task inputs and outputs expose only the approved task fields while preserving hidden metadata during permitted edits
- [x] #4 Task and milestone archive operations and all due-date fields are unavailable
- [x] #5 Exact-surface tests keep future upstream commands, tools, options, and fields hidden by default
- [x] #6 README identifies mini-backlog.md and documents its restricted surface
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 bunx tsc --noEmit passes when TypeScript touched
- [x] #2 bun test (or scoped test) passes
- [x] #3 Focused Biome checks on every changed file passed; repository-wide bun run check . produced 408 CRLF-only baseline diagnostics under the mandated Windows convention and was explicitly waived by the user.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Encode immutable command, option, MCP tool, schema-property, and output-field allowlists with fail-closed Commander tests. 2. Route the shipped CLI through the mini policy, disable interactive bypasses, and keep upstream full-surface regression coverage in an unshipped test entry. 3. Add positive task schema and output projections and verify hidden metadata survives permitted edits. 4. Restrict MCP registration and milestone schemas/output while retaining document management. 5. Update repository documentation and metadata, build the executable, run scoped checks, and record baseline-only full-suite failures.

7. Address PR #2 feedback: align all publish/install/release identities with mini-backlog.md platform packages; fail closed for dynamically registered MCP resources and prompts; preserve configured task prefixes in ambiguity errors; repair internal full-test bundle chunks; harden npm-pack JSON parsing and macOS Bun-warning filtering; verify focused and regression gates before updating the PR.

8. Reproduce the Ubuntu npm-pack output shape from CI, add an exact RED parser regression, make pack-result discovery robust without weakening package-content assertions, and rerun focused package/build checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final review fix wave completed. Indirect milestone rename/remove/reassign/rollback and Draft-demotion cleanup preserve unknown YAML inside existing task locks, including active/completed dependents and auto-committed content. Mini CLI ambiguity/recovery output, exact command/argument/option discovery, milestone paths, and MCP runtime registration are restricted. CI uses an unshipped full regression bundle; production and Nix use the seeded mini smoke. The documented source installation builds and packages this fork binary, omits upstream optional dependencies, and rejects upstream platform artifacts. Release manifests derive fork repository metadata. Final gates: 104 mini tests passed, 0 failed (456 assertions); 182 full CLI/MCP/persistence/launcher regressions passed, 0 failed, with 2 existing Windows-inapplicable launcher skips; 43 locking/vacated-reference/milestone regressions passed, 0 failed. Typecheck, focused Biome across all 23 supported changed files, production build, compiled/Nix smoke script, full/mini bundle routing, offline npm package installation, generated release artifact execution, both release manifest generators, frozen lock install, Nix lock regeneration/no-drift, YAML parsing, and git diff --check passed. The complete upstream suite was not rerun in this wave; the prior user-approved unrelated Windows failures and repository-wide CRLF-only Biome waiver remain recorded in task history. Native Nix and actionlint are not installed on this Windows host, so no native nix build or actionlint result is claimed.

PR #2 review follow-up aligned root, platform, workflow, resolver, launcher, lock, Nix, README, and development release identities to mini-backlog.md; blocked runtime-added mini MCP resources/prompts at registration and request dispatch; preserved configured prefixes in mini CLI/MCP ambiguity messages; made the internal full regression bundle self-contained; hardened npm-pack JSON parsing; and filtered only Bun's known macOS AVX warning. Fresh evidence: focused review suite 68/68; bundled browser regression 2/2; typecheck, focused Biome, frozen lock install, bun2nix regeneration, workflow YAML parse, production build, compiled smoke, and git diff check passed. A broader Windows parallel full-profile run was stopped after unrelated atomic edit, TUI, fixture, and server timing failures, per the user's instruction to ignore unrelated failures; all review-specific tests observed in that run passed.

Ubuntu CI run 35099411144 exposed the remaining parser gap: under the parallel runner, the valid npm-pack JSON array can be prefixed by a progress dot on the same line. The earlier line-start candidate scan handled newline preambles but could not reach .[...]. Added a RED regression for that exact inline prefix, then changed candidate discovery to scan every array opener from the end so nested or earlier bracket noise is rejected until the complete trailing JSON array parses. Verification: regression failed before the change; mini-compiled-entry.test.ts passed 8/8 after it; typecheck and focused Biome passed.

Retained the earlier noisy-preamble regression alongside the new inline-progress regression; the final focused file contains 9 passing tests and 24 assertions.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed Ubuntu npm-pack parsing by locating the complete trailing JSON array even when CI prefixes it inline with progress output. Verified both parser regressions, all 9 compiled/package tests, TypeScript, and focused Biome.
<!-- SECTION:FINAL_SUMMARY:END -->
