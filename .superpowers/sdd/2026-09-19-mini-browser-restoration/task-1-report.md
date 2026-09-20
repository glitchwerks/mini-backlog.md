# Task 1 Report: Restore Browser Command Policy

## Implementation details

- Added `browser` to the mini CLI positive command policy with exactly `--port` and `--no-open`.
- Updated the root CLI description to identify the full browser interface and added the browser command description.
- Updated the root-surface contract to publish `browser` and removed it from the excluded-command assertions.
- Added a focused browser help contract that permits only `--help`, `--no-open`, and `--port`, and rejects `-p` and `--non-interactive`.

## Files changed

- `src/mini/surface-policy.ts`
- `src/test/mini-cli-surface.test.ts`

## TDD evidence

### RED

Command:

```text
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
```

Result: failed as expected. The root command assertion received `doc`, `mcp`, `milestone`, `search`, and `task` without `browser`; the browser help assertion received only `--help` and inherited `--version` instead of `--no-open` and `--port`.

### GREEN

Commands:

```text
bun test --timeout=10000 src/test/mini-cli-surface.test.ts
bun run check src/mini/surface-policy.ts src/test/mini-cli-surface.test.ts
```

The focused test passed with 27 tests and 0 failures. The requested check command does not pass in this Windows checkout because Biome reports repository-wide CRLF formatting differences, including line-ending-only diagnostics in the two touched files; no semantic lint error was reported. A direct scoped `bunx biome check` reproduced the same line-ending diagnostics.

## Self-review

- Confirmed the policy contains no `-p` or `--non-interactive` browser options.
- Confirmed all existing CLI/MCP policy entries remain unchanged apart from the root description and browser additions.
- Confirmed the browser is no longer listed as hidden or rejected, while all other exclusions remain.
- Confirmed `git diff --check` reports no whitespace errors.

## Concerns

The repository's configured formatter currently treats checked-in Windows CRLF files as needing LF normalization. Per project instructions, line endings were not normalized and no unrelated files were changed. The focused behavioral test is green.
