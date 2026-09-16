# mini-backlog.md

`mini-backlog.md` is a restricted fork of [Backlog.md](https://github.com/MrLesk/Backlog.md) for task, document, and milestone management. The npm package is `mini-backlog.md`; the executable remains `backlog`. The npm registry package `backlog.md` is upstream's unrestricted product and is never installed or resolved by this fork.

## Install from this fork

Install Git, Bun 1.3.14 or newer, and Node.js with npm. Clone this fork, then build and install its local binary. These commands work in PowerShell, Git Bash, and Unix shells; run each line separately:

```bash
git clone https://github.com/glitchwerks/mini-backlog.md.git
cd mini-backlog.md
bun install --frozen-lockfile --ignore-scripts
bun run build
npm install --global --omit=optional --ignore-scripts .
backlog --help
```

The build produces `dist/backlog.exe` on Windows and `dist/backlog` elsewhere. The local package includes that binary; optional registry binaries are omitted. The wrapper refuses platform packages that identify upstream instead of this fork. Rebuild and repeat the local install after updating your checkout. Mini requires an existing Backlog.md project; it does not provide project initialization.

## Restricted surface

Only the operations and fields below are public. Excluded operations are absent from both discovery and invocation. There is no switch that restores the full Backlog.md surface.

The command table lists each public command and its explicit non-help options. `--help` remains available for every listed command.

## CLI operations

| Command | Allowed options |
| --- | --- |
| `backlog` | `--version` |
| `task` | — |
| `task create` | `--description`, `--assignee`, `--status`, `--labels`, `--priority`, `--type`, `--milestone`, `--depends-on`, `--ac`, `--acceptance-criteria`, `--plain` |
| `task list` | `--status`, `--exclude-status`, `--assignee`, `--unassigned`, `--milestone`, `--priority`, `--type`, `--labels`, `--search`, `--ready`, `--limit`, `--sort`, `--plain`, `--json`, `--watch` |
| `search` | `--type`, `--task-type`, `--status`, `--exclude-status`, `--priority`, `--limit`, `--plain`, `--json` |
| `task view` | `--plain`, `--json` |
| `task edit` | `--title`, `--description`, `--assignee`, `--status`, `--label`, `--priority`, `--type`, `--milestone`, `--clear-milestone`, `--plain`, `--add-label`, `--remove-label`, `--clear-labels`, `--ac`, `--remove-ac`, `--check-ac`, `--uncheck-ac`, `--acceptance-criteria`, `--clear-ac`, `--comment`, `--comment-author`, `--clear-deps`, `--depends-on` |
| `task complete` | — |
| `doc` | — |
| `doc create` | `--path`, `--type`, `--plain` |
| `doc update` | `--title`, `--content`, `--path`, `--type`, `--tags` |
| `doc list` | `--plain` |
| `doc search` | `--limit` |
| `doc view` | `--plain` |
| `milestone` | — |
| `milestone list` | `--show-completed`, `--plain` |
| `milestone add` | `--description` |
| `milestone rename` | `--no-update-tasks` |
| `milestone remove` | `--task-handling`, `--reassign-to` |
| `mcp` | — |
| `mcp start` | `--debug`, `--cwd` |

## MCP operations

| Tool |
| --- |
| `task_create` |
| `task_list` |
| `task_search` |
| `task_view` |
| `task_edit` |
| `task_complete` |
| `document_list` |
| `document_search` |
| `document_view` |
| `document_create` |
| `document_update` |
| `milestone_list` |
| `milestone_add` |
| `milestone_rename` |
| `milestone_remove` |

## Task MCP fields

| Operation | Allowed fields |
| --- | --- |
| `task_create` | `title`, `description`, `status`, `priority`, `type`, `milestone`, `labels`, `assignee`, `dependencies`, `acceptanceCriteria` |
| `task_list` | `status`, `type`, `assignee`, `unassigned`, `milestone`, `labels`, `search`, `ready`, `limit` |
| `task_search` | `query`, `status`, `type`, `priority`, `limit` |
| `task_edit` | `id`, `title`, `description`, `status`, `priority`, `type`, `milestone`, `labels`, `assignee`, `dependencies`, `commentsAppend`, `commentAuthor`, `acceptanceCriteriaSet`, `acceptanceCriteriaAdd`, `acceptanceCriteriaRemove`, `acceptanceCriteriaCheck`, `acceptanceCriteriaUncheck` |
| `task_summary` | `id`, `title`, `status`, `type`, `priority`, `assignees`, `labels`, `milestone`, `acceptanceCriteriaCompleted`, `acceptanceCriteriaCount`, `createdAt`, `updatedAt` |
| `task_detail` | `id`, `title`, `status`, `type`, `priority`, `assignees`, `labels`, `milestone`, `acceptanceCriteriaCompleted`, `acceptanceCriteriaCount`, `createdAt`, `updatedAt`, `description`, `dependencies`, `acceptanceCriteria`, `comments` |

The MCP server starts with `backlog mcp start`. Workflow and Definition-of-Done resources and tools are not exposed. Task and milestone archive operations, due-date inputs and outputs, and every other upstream command and tool are unavailable.

## Upstream synchronization

For development, `bun run check:types` checks TypeScript, `bun run check` checks formatting and lint, and `bun run test` runs the tests. CI bundles upstream regressions with `BACKLOG_BUILD_OUTDIR=<temporary-directory> bun scripts/build-test-cli.ts` and sets `BACKLOG_TEST_CLI_BUNDLE` to that directory's `full-cli-entry.js`. This test harness is not shipped. `bun run build` always builds mini. `bun scripts/smoke-compiled-build.ts <binary-path> <version>` exercises the same mini smoke used by CI and Nix.

This fork synchronizes upstream changes from [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) while keeping the restricted public surface above. Its root and platform npm packages use the `mini-backlog.md` identity; the executable remains `backlog`.

## License

Backlog.md is released under the [MIT License](LICENSE).
