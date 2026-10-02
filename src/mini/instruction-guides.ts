import type { InstructionGuideKey } from "../mcp/workflow-guides.ts";

export const MINI_INSTRUCTION_GUIDE_TEXT = Object.freeze({
	overview: `## Backlog.md Overview (CLI)

This project uses Backlog.md to track features, bugs, and structured work as tasks.

### When to Use Backlog

Create a task for substantive work that needs planning, decisions, or handoff notes. Skip task creation for questions,
explanations, quick lookups, and obvious mechanical changes.

### Start Every Request Here

Search and read before changing anything:

- \`backlog search "query" --plain\`
- \`backlog task list --status "<todo status>" --plain\`
- \`backlog task list --search "login" --labels frontend,bug --limit 20 --plain\`
- \`backlog task view {{TASK_ID:123}} --plain\`

Use \`--json\` instead of \`--plain\` when a script needs stable output. For a live task list, use
\`backlog task list --json --watch\` and replace the previous list with each complete JSON response.

### Detailed Guides

- \`backlog instructions task-creation\` before creating tasks
- \`backlog instructions task-execution\` before planning or updating task work
- \`backlog instructions task-finalization\` before finishing tasks
- \`backlog instructions init-required\` when the current directory is not initialized

Use \`backlog <command> --help\` before unfamiliar operations. Use Backlog commands for task, document, and milestone
changes so metadata, relationships, and history stay consistent.`,
	"task-creation": `## Task Creation Guide (Mini CLI)

Use this guide when new Backlog tasks are needed.

### Search First

Check whether the work is already tracked:

- \`backlog search "desktop app" --plain\`
- \`backlog task list --status "<todo status>" --plain\`
- \`backlog task list --exclude-status "<terminal status>" --plain\`
- \`backlog task list --type {{TASK_TYPE:1}} --plain\`
- \`backlog task view {{TASK_ID:123}} --plain\`

### Scope the Work

Create one task for work that fits one focused change. Create separate tasks with dependencies when work has independent
delivery points or must happen in order.

### Create Tasks

Give each task a clear title, a description of the problem or need, testable acceptance criteria, and an assignee when
the owner is known. Add dependencies only when ordering is required.

\`\`\`bash
backlog task create "Add bulk update API" -d "Users need one command to update a reviewed set of tasks." \\
  --ac "The command updates every selected task" -a @your-name
backlog task create "Add bulk update UI" --depends-on {{TASK_ID:21}}
\`\`\`

Use single-quoted arguments when task text contains literal Markdown backticks so the shell does not interpret them.

After creation, report the task IDs, titles, and key acceptance criteria. Before starting implementation, read
\`backlog instructions task-execution\`.`,
	"task-execution": `## Task Execution Guide (Mini CLI)

Use this guide when working on an existing Backlog task.

### Start the Task

1. Read the task: \`backlog task view {{TASK_ID:123}} --plain\`.
2. Confirm the scope, acceptance criteria, dependencies, and current status.
3. Mark it active and assign yourself:
   - \`backlog task edit {{TASK_ID:123}} -s "<active status>" -a @your-name\`
4. Research the current system and draft a concise implementation approach for review.
5. Record durable decisions or review questions as comments:
   - \`backlog task edit {{TASK_ID:123}} --comment "Implement the shared parser first." --comment-author @your-name\`

### Work in Short Loops

1. Implement one focused slice.
2. Run relevant tests or checks.
3. Record useful progress with a task comment when it matters for handoff.
4. Keep scope changes explicit; ask before expanding the task or creating follow-up work.

Use \`backlog task edit {{TASK_ID:123}} --help\` before changing unfamiliar fields. Use CLI commands rather than editing
Backlog Markdown directly.

When implementation is ready to verify, read \`backlog instructions task-finalization\`.`,
	"task-finalization": `## Task Finalization Guide (Mini CLI)

Use this guide when implementation is complete and ready for handoff.

### Verify and Finish

1. Review the task: \`backlog task view {{TASK_ID:123}} --plain\`.
2. Run objective verification for every acceptance criterion.
3. Check only criteria proven by that evidence:
   - \`backlog task edit {{TASK_ID:123}} --check-ac 1\`
4. Record the verification result and concise handoff summary:
   - \`backlog task edit {{TASK_ID:123}} --comment "Implemented the parser; bun test passed." --comment-author @your-name\`
5. Move the task to the configured terminal status:
   - \`backlog task edit {{TASK_ID:123}} -s "<terminal status>"\`
6. Move the terminal-status task to the completed folder when requested:
   - \`backlog task complete {{TASK_ID:123}}\`

Do not check acceptance criteria from code presence or intent alone. Do not start follow-up work without user approval.`,
	"init-required": `## Backlog.md Initialization Required (Mini CLI)

This directory does not have Backlog.md initialized.

Run \`backlog init\` for interactive setup or \`backlog init --defaults\` for non-interactive defaults. For a local
project without Git, run \`backlog init --no-git\`.

After initialization, run \`backlog instructions overview\` and follow the matching task guide.`,
} satisfies Readonly<Record<InstructionGuideKey, string>>);
