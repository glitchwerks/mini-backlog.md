# Runtime surface capture

Capture the public discovery surface of a selected Backlog build without reading its source or requiring Git. This is development tooling; it does not add a shipped Backlog command.

## Select a build and fixture

Use a disposable project initialized with the selected build's public `backlog init` command. Keep its configuration fixed when comparing builds. MCP discovery is project-sensitive: an initialized project exposes different tools and schemas from an uninitialized directory.

Create a target JSON file:

```json
{
  "command": ["C:/builds/mini-backlog/dist/backlog.exe"],
  "cwd": "C:/fixtures/backlog-surface",
  "label": "mini-v1.53.0",
  "revision": "optional-build-commit-id",
  "timeoutMs": 10000
}
```

`command` is an executable followed by literal arguments, never a shell command string. On Unix, use the selected executable's absolute path. To capture a source build, use its runtime and absolute entry point, for example `["bun", "C:/builds/mini-backlog/src/bin/cli.ts"]`. The executable can be on PATH; source entry points must resolve correctly from the fixture directory. Use direct binaries/runtime entry points rather than shell wrappers.

`cwd` must be an existing absolute directory. `label` identifies the build; `revision` is optional metadata supplied by the caller. No Git lookup occurs. `timeoutMs` bounds each CLI invocation and MCP request, defaults to 10000, and accepts integers from 1 to 60000.

The child processes receive a minimal runtime environment and the explicit fixture directory through both cwd and BACKLOG_CWD. Ambient Backlog settings are not forwarded. Use a fixture with explicit configuration for settings that affect discovery.

## Capture

From this repository with its development dependencies installed:

```bash
bun scripts/capture-surface.ts --target target.json --output manifest.json
```

The collector runs `--version`, traverses public CLI `--help`, and starts the same executable with `mcp start` for MCP discovery. It never imports that build's internal modules. Select a real upstream build for upstream captures: this fork's internal full-mode test entry contains fork changes and is not a pristine upstream substitute.

Output is published atomically after every discovery step succeeds. Failed captures leave any previous output intact. Invalid targets, failed launches, timeouts, malformed help, pagination loops, duplicate discovery identities, and discovery limits cause a nonzero exit.

## Manifest

Manifest version 1 contains:

- `identity`: label, optional revision, CLI version, and MCP server identity. These identify the build separately from its comparable surface.
- `surface.cli`: command paths, aliases, positional argument syntax, and option spellings/argument syntax. Descriptive help prose is omitted. The standard redirecting `help [command]` entry is recorded from its parent's public listing.
- `surface.mcp`: complete advertised tools and schemas, resources, resource templates, and prompts, following every discovery page. Capabilities not advertised by the server have empty lists.

Object keys and discovery collections are sorted deterministically. Arrays within schemas retain their advertised order and content. Version 1 has no capture timestamps, executable paths, or fixture paths in its identity. Repeated captures of the same build/configuration should therefore produce identical bytes unless the build itself advertises variable data.

The help parser supports Backlog's current English Commander help layout and fails on unsupported syntax. Traversal is limited to 500 commands and 20 path components; each MCP discovery collection is limited to 500 pages.

## Limits

Discovery describes advertised commands and schemas. It does not prove that hidden invocations are rejected or that operations behave correctly. Keep existing contract, invocation-rejection, metadata-preservation, browser, and regression tests.

Representative operation response shapes, an approved mini baseline, comparison reports, and the sync gate are separate milestone issues #11, #12, and #13. No manifest is automatically approved. Browser HTTP routes and instruction-guide content are not enumerated by version 1. No branch layout, release version, or tag changes are performed by capture.
