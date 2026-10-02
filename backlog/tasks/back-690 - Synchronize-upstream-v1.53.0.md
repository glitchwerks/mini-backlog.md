---
id: BACK-690
title: Synchronize upstream v1.53.0
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-02 16:17'
updated_date: '2026-10-02 16:18'
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
- [ ] #1 Upstream release changes are integrated and fork task history is preserved
- [ ] #2 Mini CLI/MCP and installed guidance regressions pass
- [ ] #3 Version 1.53.0 type-check, build, compiled smoke, and tag validation pass
- [ ] #4 A focused PR links issue #8 and records established baseline failures
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 bunx tsc --noEmit passes when TypeScript touched
- [ ] #2 bun run check . passes when formatting/linting touched
- [ ] #3 bun test (or scoped test) passes
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Merge upstream release fd20f714 (v1.53.0) into the isolated branch based on fork main 9a99f1c8 (issue #8). 2. Preserve mini-specific CLI/init, launcher, JSON projections, browser and packaging in merge resolutions (README.md; PR #7). 3. Use doctor preview and supported duplicate-ID repair to retain overlapping upstream/fork task history; record any reference mappings (upstream BACK-687..689; fork PRs #2/#6/#7). 4. Match the published version 1.53.0 (upstream release URL in issue #8; tagged package.json still 1.52.0), extend surface regressions for newly excluded options, and run upstream watcher/list plus mini suites. 5. Verify TypeScript, targeted Biome, source-only build, compiled browser smoke and mini-v1.53.0 tag validation; commit and open PR closing #8 (README.md Upstream synchronization).
<!-- SECTION:PLAN:END -->
