# Runtime Surface Discovery Implementation Plan

> Execute inline with test-driven development and a final code review.

**Goal:** Deliver the runtime CLI/MCP inventory requested in GitHub #10.

**Architecture:** An internal capture script launches an explicitly configured build as an external process. CLI help and MCP discovery produce a versioned, canonical JSON inventory. No source inspection, Git dependency, baseline approval, or response probes are part of this slice. These boundaries and required failure behavior come from #10; response probes and approval/comparison are tracked separately in #11 and #12.

**Tech stack:** Use the repository's Bun/TypeScript runtime and installed MCP client SDK; package.json declares these dependencies. The shipped mini boundary is documented in README.md and was established in #1/PR #2, with the browser exception in #5/PR #6. Use actual selected builds, not the fork's internal full-mode harness (#10).

## Execution

- [ ] Add an external fixture exposing CLI aliases/arguments/options and paginated MCP discovery; add a capture-command test and observe the missing-tool failure (#10).
- [ ] Add scripts/surface-manifest.ts for target validation, complete help traversal, bounded child-process execution, paginated MCP discovery, and canonical JSON (#10).
- [ ] Add scripts/capture-surface.ts for target/output arguments and atomic publication only after successful capture (#10).
- [ ] Test deterministic captures, schema constraints, unsupported capabilities, malformed help/pages, launch/timeouts, and cleanup (#10).
- [ ] Capture the real mini source CLI twice against a disposable project and verify equal inventories; verify the current mini contract suites (#10; PR #9 records existing unrelated platform failures).
- [ ] Document target format, capture command, and limits in README.md and docs/runtime-surface-capture.md; update the execution record and issue, verify types/scoped formatting/tests, commit, and create a PR into codex/mini-surface-sync (#10).

## Review focus

Fail instead of silently truncating malformed CLI help or MCP pagination; retain full schema constraints; keep argv literal; close child processes on every failure; do not mutate the caller's project through operation probes; retain generated manifests only when explicitly requested (#10, #11).

Branch migration remains a candidate follow-up (#14). Current source-only releases and tags stay governed by #3/PR #4.
