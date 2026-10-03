## Local Development

> **Runtime requirement:** Use the Bun version pinned by CI and `@types/bun`. Bun 1.3.5 fixed the macOS websocket CPU regression tracked in [oven-sh/bun#23536](https://github.com/oven-sh/bun/issues/23536), so local development should stay on current Bun 1.3.x builds or newer rather than the old 1.2.23 workaround.

Run these commands to bootstrap the project:

```bash
bun install
```

Run tests:

```bash
bun run test
```

Format and lint:

```bash
npx biome check .
```

For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## MCP Development Setup

This project supports MCP (Model Context Protocol) integration. To develop and test MCP features:

### Prerequisites

Install at least one AI coding assistant:
- [Claude Code](https://claude.ai/download)
- [OpenAI Codex CLI](https://openai.com/codex)
- [Google Gemini CLI](https://cloud.google.com/gemini/docs/codeassist/gemini-cli)
- [Kiro CLI](https://kiro.dev)

### Local MCP Testing

#### 1. Start MCP Server in Development Mode

```bash
# Terminal 1: Start the MCP server
bun run mcp

# Optional: include debug logs
bun run mcp -- --debug
```

The server will start and listen on stdio. You should see log messages confirming the stdio transport is active.

#### 2. Configure Your Agent

Choose one of the methods below based on your agent:

**Claude Code (Recommended for Development):**
```bash
# Add to project (creates .mcp.json)
claude mcp add backlog-dev -- bun run mcp
```

**Codex CLI:**
```bash
# Edit ~/.codex/config.toml
[mcp_servers.backlog-dev]
command = "bun"
args = ["run", "mcp"]
```

**Gemini CLI:**
```bash
gemini mcp add backlog-dev bun run mcp
```

**Kiro CLI:**
```bash
kiro-cli mcp add --scope global --name backlog-dev --command bun --args run,mcp
```

#### 3. Test the Connection

Open your agent and test:
- "Show me all tasks in this project"
- "Create a test task called 'Test MCP Integration'"
- "Display the current board"

#### 4. Development Workflow

1. Make changes to MCP tools in `src/mcp/tools/`
2. Restart the MCP server (Ctrl+C, then re-run)
3. Restart your AI agent
4. Test your changes

### Testing Individual Agents

Each AI agent has different configuration requirements. Start the server from your project root and follow the assistant's instructions to register it:

```bash
backlog mcp start
```

### Testing with MCP Inspector

Use the Inspector tooling when you want to exercise the stdio server outside an AI agent.

#### GUI workflow (`npx @modelcontextprotocol/inspector`)

1. Launch the Inspector UI in a terminal: `npx @modelcontextprotocol/inspector`
2. Choose **STDIO** transport.
3. Fill the connection fields exactly as follows:
   - **Command**: `bun`
   - **Arguments** (enter each item separately): `--cwd`, `/Users/<you>/Projects/Backlog.md`, `src/cli.ts`, `mcp`, `start`
   - Remove any proxy token; it is not needed for local stdio.
4. Connect and use the tools/resources panes to issue MCP requests.

> Replace `/Users/<you>/Projects/Backlog.md` with the absolute path to your local Backlog.md checkout.

`bun run mcp` by itself prints Bun's `$ bun …` preamble, which breaks the Inspector’s JSON parser. If you prefer using the package script here, add `--silent` so the startup log disappears:

```
Command: bun
Arguments: run, --silent, mcp
```

> Remember to substitute your own project directory for `/Users/<you>/Projects/Backlog.md`.

#### CLI workflow (`npx @modelcontextprotocol/inspector-cli`)

Run the CLI helper when you want to script quick checks:

```bash
npx @modelcontextprotocol/inspector-cli \
  --cli \
  --transport stdio \
  --method tools/list \
  -- bun --cwd /Users/<you>/Projects/Backlog.md src/cli.ts mcp start
```

The key detail in both flows is to call `src/cli.ts mcp start` directly (or `bun run --silent mcp`) so stdout stays pure JSON for the MCP handshake.

### Adding New MCP Agents


### Project Structure

```
backlog.md/
├── src/
│   ├── mcp/
│   │   ├── errors/          # MCP error helpers
│   │   ├── resources/       # Read-only resource adapters
│   │   ├── tools/           # MCP tool implementations
│   │   ├── utils/           # Shared utilities
│   │   ├── validation/      # Input validators
│   │   └── server.ts        # createMcpServer entry point
└── docs/
    ├── mcp/                 # User-facing MCP docs
    └── development/         # Developer docs
```

## Release

### Synchronization review

Use [the runtime capture procedure](docs/runtime-surface-capture.md) to capture real selected upstream builds and [the three comparisons](docs/surfaces/README.md) to review their difference from mini. On a temporary branch from the current mini integration branch, merge the selected upstream release and retain that merge commit when integrating the reviewed candidate. Run the compiled candidate check described in README and the existing tests before integration. This preserves the source ancestry used for later syncs (issue #13; PR #9).

CI's compile jobs run `scripts/check-mini-surface.ts` on the binaries they build and upload candidate snapshots and comparison reports, including on drift. The check fails on changes without modifying the baseline. Baseline changes require an explicit reviewed PR. The current default-branch ruleset does not require CI status checks; runtime failure is visible in CI but administrator enforcement remains part of the branch proposal in #14.

### Source release

Mini Backlog.md is distributed from source only. It does not publish npm packages
or attach prebuilt binaries to GitHub releases.

1. Synchronize an upstream release and retain its exact `package.json` version.
   Never increment the fork beyond its upstream base.
2. Merge the synchronization and restricted-surface changes into the fork's
   `main` branch.
3. Validate a fork-specific tag whose version exactly matches `package.json`:
   ```bash
   bun scripts/validate-mini-tag.ts mini-v<major.minor.patch>
   ```
4. Tag the merged fork commit and push only the fork-specific tag:
   ```bash
   git tag mini-v<major.minor.patch>
   git push <fork-remote> mini-v<major.minor.patch>
   ```
5. Confirm the normal CI workflow passes for the tag. CI builds and tests the
   source but publishes no packages and uploads no release binaries.

Inherited upstream `v<major.minor.patch>` tags remain attached to their upstream
commits and must never be moved or rewritten. GitHub's automatic source archives
for `mini-v*` tags are the only release downloads.

[← Back to README](README.md)
