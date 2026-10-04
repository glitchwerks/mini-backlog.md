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
# Include representative operation responses:
bun scripts/capture-surface.ts --target target.json --output manifest.json --responses
```

The collector runs `--version`, traverses public CLI `--help`, and starts the same executable with `mcp start` for MCP discovery. It never imports that build's internal modules. Select a real upstream build for upstream captures: this fork's internal full-mode test entry contains fork changes and is not a pristine upstream substitute.

Output is published atomically after every discovery step succeeds. Failed captures leave any previous output intact. Invalid targets, failed launches, timeouts, malformed help, pagination loops, duplicate discovery identities, and discovery limits cause a nonzero exit.

With `--responses`, the collector allocates a new temporary directory and initializes it through the selected executable's public `init` command. It fixes the project name, task prefix, padding, branch checks, remote inclusion, and integration settings. All mutations run there, never in the target's `cwd`. The temporary project and MCP process are cleaned up on success and failure. The executable and source entry points must remain resolvable from this new directory.

## Manifest

Manifest version 1 contains:

- `identity`: label, optional revision, CLI version, and MCP server identity. These identify the build separately from its comparable surface.
- `surface.cli`: command paths, aliases, positional argument syntax, and option spellings/argument syntax. Descriptive help prose is omitted. The standard redirecting `help [command]` entry is recorded from its parent's public listing.
- `surface.mcp`: complete advertised tools and schemas, resources, resource templates, and prompts, following every discovery page. Capabilities not advertised by the server have empty lists.

Object keys and discovery collections are sorted deterministically. Arrays within schemas retain their advertised order and content. Version 1 has no capture timestamps, executable paths, or fixture paths in its identity. Repeated captures of the same build/configuration should therefore produce identical bytes unless the build itself advertises variable data.

The help parser supports Backlog's current English Commander help layout and fails on unsupported syntax. Traversal is limited to 500 commands and 20 path components; each MCP discovery collection is limited to 500 pages.

`--responses` emits manifest version 2, adding `surface.responses` with `profileVersion: 1` and named probes. Use the same manifest and profile versions for comparisons. Discovery-only captures remain version 1; they cannot supply a response baseline.

The fixed profile reads empty, sparse, and populated task lists; task details with nullable metadata, dependencies, acceptance criteria, and anonymous/authored comments; search JSON; plain task/document/milestone output; and all 15 mini MCP operations, including completion. Documents are created and updated, and a milestone is added, renamed, and removed through MCP. Fixture IDs come from public responses and the CLI allocator.

Each probe records JSON field paths (root `$`, array elements `*`, escaped property names), observed type unions, and whether a property is absent in any observed object at its parent path. This is **observed optionality**, not a schema guarantee. Values are omitted, including generated IDs, timestamps, and paths; their fields and types remain. MCP envelopes are retained structurally, with advertised response content block types. Plain text records column-zero field and section labels and the distinct combinations observed; it does not infer types or preserve prose. Errors, malformed JSON, or unsupported fixture operations abort the capture without replacing its output.

## Limits

Discovery describes advertised commands and schemas. It does not prove that hidden invocations are rejected or that operations behave correctly. Keep existing contract, invocation-rejection, metadata-preservation, browser, and regression tests.

Representative probes do not prove every behavior, response variant, formatted value, or text layout. Empty collections cannot reveal element fields until populated. Browser HTTP routes and instruction-guide content are not enumerated. Keep behavioral and metadata tests; the manifest supplements them. An approved mini baseline, comparison reports, and the sync gate are separate milestone issues #12 and #13. No manifest is automatically approved. No branch layout, release version, or tag changes are performed by capture.
