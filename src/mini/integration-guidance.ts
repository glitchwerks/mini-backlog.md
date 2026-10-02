import { CLAUDE_AGENT_CONTENT, MCP_AGENT_NUDGE } from "../constants/index.ts";
import type { SurfaceMode } from "./runtime.ts";
import { MINI_MCP_TOOL_NAMES } from "./surface-policy.ts";

const MINI_CLAUDE_AGENT_CONTENT = `---
name: project-manager-backlog
description: Manage project tasks through the restricted mini-backlog.md CLI surface.
---

Use the \`backlog\` CLI for task, document, and milestone work. Never edit Backlog Markdown files directly.

At the beginning of a request, run \`backlog instructions overview\`. Before task lifecycle work, read the matching
guide with \`backlog instructions task-creation\`, \`backlog instructions task-execution\`, or
\`backlog instructions task-finalization\`.

Use the restricted commands exposed by this installation:

- Search with \`backlog search "query" --plain\` and \`backlog task list --plain\`.
- Inspect a task with \`backlog task view TASK-123 --plain\`.
- Create a task with \`backlog task create "Title" -d "Why it matters" --ac "Testable outcome"\`.
- Update a task with \`backlog task edit TASK-123 -s "In Progress" -a @your-name\`.
- Record durable discussion with \`backlog task edit TASK-123 --comment "Update" --comment-author @your-name\`.
- Finish a terminal-status task with \`backlog task complete TASK-123\` when requested.

Use \`backlog <command> --help\` before unfamiliar operations so every command and option stays within the installed
surface.`;

const MINI_MCP_AGENT_NUDGE = `<CRITICAL_INSTRUCTION>

## MINI-BACKLOG.MD MCP WORKFLOW

This project uses the restricted mini-backlog.md MCP tool surface for task, document, and milestone management.

Start by listing or searching existing tasks. View a task before editing it, create one only for substantive work, and
complete it only after its configured terminal status and acceptance criteria are verified.

Available tools:
${MINI_MCP_TOOL_NAMES.map((tool) => `- \`${tool}\``).join("\n")}

Use only these installed tools and their published schemas. Do not edit Backlog Markdown files directly.

</CRITICAL_INSTRUCTION>`;

interface IntegrationGuidance {
	claudeAgent: string;
	mcpAgentNudge: string;
}

const FULL_INTEGRATION_GUIDANCE = Object.freeze({
	claudeAgent: CLAUDE_AGENT_CONTENT,
	mcpAgentNudge: MCP_AGENT_NUDGE,
});

const MINI_INTEGRATION_GUIDANCE = Object.freeze({
	claudeAgent: MINI_CLAUDE_AGENT_CONTENT,
	mcpAgentNudge: MINI_MCP_AGENT_NUDGE,
});

/** Selects integration guidance without changing the production templates. */
export function getIntegrationGuidance(surface: SurfaceMode): IntegrationGuidance {
	return surface === "mini" ? MINI_INTEGRATION_GUIDANCE : FULL_INTEGRATION_GUIDANCE;
}
