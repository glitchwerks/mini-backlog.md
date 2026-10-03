# Runtime surface comparison

upstream tag v1.53.0 → mini-v1.53.0 candidate demonstration

Manifest version: 2. Changes: 217.

| Change | Path | Before | After |
| --- | --- | --- | --- |
| removed | /cli/agents | {"path":["agents"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--update-instructions":{"flags":["--update-instructions"],"argument":null}}} | — |
| removed | /cli/board | {"path":["board"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--layout,-l":{"flags":["--layout","-l"],"argument":"&lt;layout&gt;"},"--milestones,-m":{"flags":["--milestones","-m"],"argument":null},"--vertical":{"flags":["--vertical"],"argument":null}}} | — |
| removed | /cli/board export | {"path":["board","export"],"aliases":[],"arguments":["[filename]"],"options":{"--export-version":{"flags":["--export-version"],"argument":"&lt;version&gt;"},"--force":{"flags":["--force"],"argument":null},"--help,-h":{"flags":["--help","-h"],"argument":null},"--readme":{"flags":["--readme"],"argument":null}}} | — |
| removed | /cli/board view | {"path":["board","view"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--layout,-l":{"flags":["--layout","-l"],"argument":"&lt;layout&gt;"},"--milestones,-m":{"flags":["--milestones","-m"],"argument":null},"--vertical":{"flags":["--vertical"],"argument":null}}} | — |
| removed | /cli/browser/options/--non-interactive | {"flags":["--non-interactive"],"argument":null} | — |
| removed | /cli/cleanup | {"path":["cleanup"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/completion | {"path":["completion"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/completion __complete | {"path":["completion","__complete"],"aliases":[],"arguments":["&lt;line&gt;","&lt;point&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/completion help | {"path":["completion","help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| removed | /cli/completion install | {"path":["completion","install"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--shell":{"flags":["--shell"],"argument":"&lt;shell&gt;"}}} | — |
| removed | /cli/config | {"path":["config"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/config get | {"path":["config","get"],"aliases":[],"arguments":["&lt;key&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/config list | {"path":["config","list"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/config set | {"path":["config","set"],"aliases":[],"arguments":["&lt;key&gt;","&lt;value&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/decision | {"path":["decision"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/decision create | {"path":["decision","create"],"aliases":[],"arguments":["&lt;title&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--plain":{"flags":["--plain"],"argument":null},"--status,-s":{"flags":["--status","-s"],"argument":"&lt;status&gt;"}}} | — |
| removed | /cli/decision help | {"path":["decision","help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| removed | /cli/decision list | {"path":["decision","list"],"aliases":[],"arguments":[],"options":{"--count":{"flags":["--count"],"argument":null},"--help,-h":{"flags":["--help","-h"],"argument":null},"--json":{"flags":["--json"],"argument":null},"--max-count":{"flags":["--max-count"],"argument":"&lt;n&gt;"},"--plain":{"flags":["--plain"],"argument":null},"--skip":{"flags":["--skip"],"argument":"&lt;n&gt;"}}} | — |
| removed | /cli/doc help | {"path":["doc","help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| removed | /cli/doc list/options/--count | {"flags":["--count"],"argument":null} | — |
| removed | /cli/doc list/options/--max-count | {"flags":["--max-count"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/doc list/options/--skip | {"flags":["--skip"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/doc search/options/--count | {"flags":["--count"],"argument":null} | — |
| removed | /cli/doc search/options/--max-count | {"flags":["--max-count"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/doc search/options/--skip | {"flags":["--skip"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/doctor | {"path":["doctor"],"aliases":[],"arguments":[],"options":{"--fix":{"flags":["--fix"],"argument":null},"--help,-h":{"flags":["--help","-h"],"argument":null},"--yes":{"flags":["--yes"],"argument":null}}} | — |
| removed | /cli/draft | {"path":["draft"],"aliases":[],"arguments":["[taskId]"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--plain":{"flags":["--plain"],"argument":null}}} | — |
| removed | /cli/draft archive | {"path":["draft","archive"],"aliases":[],"arguments":["&lt;taskId&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/draft create | {"path":["draft","create"],"aliases":[],"arguments":["&lt;title&gt;"],"options":{"--assignee,-a":{"flags":["--assignee","-a"],"argument":"&lt;assignees&gt;"},"--desc":{"flags":["--desc"],"argument":"&lt;text&gt;"},"--description,-d":{"flags":["--description","-d"],"argument":"&lt;text&gt;"},"--help,-h":{"flags":["--help","-h"],"argument":null},"--labels,-l":{"flags":["--labels","-l"],"argument":"&lt;labels&gt;"},"--status,-s":{"flags":["--status","-s"],"argument":"&lt;status&gt;"}}} | — |
| removed | /cli/draft edit | {"path":["draft","edit"],"aliases":[],"arguments":["[taskId]"],"options":{"--ac":{"flags":["--ac"],"argument":"&lt;criteria&gt;"},"--acceptance-criteria":{"flags":["--acceptance-criteria"],"argument":"&lt;criteria&gt;"},"--add-label":{"flags":["--add-label"],"argument":"&lt;labels&gt;"},"--add-ref":{"flags":["--add-ref"],"argument":"&lt;reference&gt;"},"--append-final-summary":{"flags":["--append-final-summary"],"argument":"&lt;text&gt;"},"--append-notes":{"flags":["--append-notes"],"argument":"&lt;text&gt;"},"--append-plan":{"flags":["--append-plan"],"argument":"&lt;text&gt;"},"--assignee,-a":{"flags":["--assignee","-a"],"argument":"&lt;assignees&gt;"},"--check-ac":{"flags":["--check-ac"],"argument":"&lt;index&gt;"},"--check-dod":{"flags":["--check-dod"],"argument":"&lt;index&gt;"},"--clear-ac":{"flags":["--clear-ac"],"argument":null},"--clear-deps":{"flags":["--clear-deps"],"argument":null},"--clear-docs":{"flags":["--clear-docs"],"argument":null},"--clear-due-date":{"flags":["--clear-due-date"],"argument":null},"--clear-final-summary":{"flags":["--clear-final-summary"],"argument":null},"--clear-labels":{"flags":["--clear-labels"],"argument":null},"--clear-milestone":{"flags":["--clear-milestone"],"argument":null},"--clear-refs":{"flags":["--clear-refs"],"argument":null},"--comment":{"flags":["--comment"],"argument":"&lt;text&gt;"},"--comment-author":{"flags":["--comment-author"],"argument":"&lt;author&gt;"},"--dep":{"flags":["--dep"],"argument":"&lt;taskIds&gt;"},"--depends-on":{"flags":["--depends-on"],"argument":"&lt;taskIds&gt;"},"--desc":{"flags":["--desc"],"argument":"&lt;text&gt;"},"--description,-d":{"flags":["--description","-d"],"argument":"&lt;text&gt;"},"--doc":{"flags":["--doc"],"argument":"&lt;documentation&gt;"},"--dod":{"flags":["--dod"],"argument":"&lt;item&gt;"},"--due-date":{"flags":["--due-date"],"argument":"&lt;date&gt;"},"--final-summary":{"flags":["--final-summary"],"argument":"&lt;text&gt;"},"--help,-h":{"flags":["--help","-h"],"argument":null},"--label,-l":{"flags":["--label","-l"],"argument":"&lt;labels&gt;"},"--milestone,-m":{"flags":["--milestone","-m"],"argument":"&lt;milestone&gt;"},"--modified-file":{"flags":["--modified-file"],"argument":"&lt;path&gt;"},"--notes":{"flags":["--notes"],"argument":"&lt;text&gt;"},"--ordinal":{"flags":["--ordinal"],"argument":"&lt;number&gt;"},"--plain":{"flags":["--plain"],"argument":null},"--plan":{"flags":["--plan"],"argument":"&lt;text&gt;"},"--priority":{"flags":["--priority"],"argument":"&lt;priority&gt;"},"--project":{"flags":["--project"],"argument":"&lt;project&gt;"},"--ref":{"flags":["--ref"],"argument":"&lt;reference&gt;"},"--remove-ac":{"flags":["--remove-ac"],"argument":"&lt;index&gt;"},"--remove-dod":{"flags":["--remove-dod"],"argument":"&lt;index&gt;"},"--remove-label":{"flags":["--remove-label"],"argument":"&lt;labels&gt;"},"--remove-ref":{"flags":["--remove-ref"],"argument":"&lt;reference&gt;"},"--status,-s":{"flags":["--status","-s"],"argument":"&lt;status&gt;"},"--title,-t":{"flags":["--title","-t"],"argument":"&lt;title&gt;"},"--type":{"flags":["--type"],"argument":"&lt;type&gt;"},"--uncheck-ac":{"flags":["--uncheck-ac"],"argument":"&lt;index&gt;"},"--uncheck-dod":{"flags":["--uncheck-dod"],"argument":"&lt;index&gt;"}}} | — |
| removed | /cli/draft list | {"path":["draft","list"],"aliases":[],"arguments":[],"options":{"--count":{"flags":["--count"],"argument":null},"--help,-h":{"flags":["--help","-h"],"argument":null},"--max-count":{"flags":["--max-count"],"argument":"&lt;n&gt;"},"--plain":{"flags":["--plain"],"argument":null},"--skip":{"flags":["--skip"],"argument":"&lt;n&gt;"},"--sort":{"flags":["--sort"],"argument":"&lt;field&gt;"}}} | — |
| removed | /cli/draft promote | {"path":["draft","promote"],"aliases":[],"arguments":["&lt;taskId&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/draft view | {"path":["draft","view"],"aliases":[],"arguments":["&lt;taskId&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null},"--plain":{"flags":["--plain"],"argument":null}}} | — |
| removed | /cli/help | {"path":["help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| removed | /cli/mcp help | {"path":["mcp","help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| changed | /cli/milestone/aliases | ["milestones"] | [] |
| removed | /cli/milestone add/options/--due-date | {"flags":["--due-date"],"argument":"&lt;date&gt;"} | — |
| removed | /cli/milestone archive | {"path":["milestone","archive"],"aliases":[],"arguments":["&lt;name&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/milestone help | {"path":["milestone","help"],"aliases":[],"arguments":["[command]"],"options":{}} | — |
| removed | /cli/milestone list/options/--count | {"flags":["--count"],"argument":null} | — |
| removed | /cli/milestone list/options/--max-count | {"flags":["--max-count"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/milestone list/options/--skip | {"flags":["--skip"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/milestone rename/options/--clear-due-date | {"flags":["--clear-due-date"],"argument":null} | — |
| removed | /cli/milestone rename/options/--due-date | {"flags":["--due-date"],"argument":"&lt;date&gt;"} | — |
| removed | /cli/overview | {"path":["overview"],"aliases":[],"arguments":[],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| removed | /cli/search/options/--count | {"flags":["--count"],"argument":null} | — |
| removed | /cli/search/options/--max-count | {"flags":["--max-count"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/search/options/--modified-file | {"flags":["--modified-file"],"argument":"&lt;path&gt;"} | — |
| removed | /cli/search/options/--project | {"flags":["--project"],"argument":"&lt;project&gt;"} | — |
| removed | /cli/search/options/--skip | {"flags":["--skip"],"argument":"&lt;n&gt;"} | — |
| changed | /cli/task/aliases | ["tasks"] | [] |
| changed | /cli/task/arguments | ["[taskId]"] | [] |
| removed | /cli/task/options/--json | {"flags":["--json"],"argument":null} | — |
| removed | /cli/task/options/--plain | {"flags":["--plain"],"argument":null} | — |
| removed | /cli/task archive | {"path":["task","archive"],"aliases":[],"arguments":["&lt;taskId&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| changed | /cli/task create/arguments | ["[title]"] | ["&lt;title&gt;"] |
| removed | /cli/task create/options/--dep | {"flags":["--dep"],"argument":"&lt;taskIds&gt;"} | — |
| removed | /cli/task create/options/--desc | {"flags":["--desc"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task create/options/--doc | {"flags":["--doc"],"argument":"&lt;documentation&gt;"} | — |
| removed | /cli/task create/options/--dod | {"flags":["--dod"],"argument":"&lt;item&gt;"} | — |
| removed | /cli/task create/options/--draft | {"flags":["--draft"],"argument":null} | — |
| removed | /cli/task create/options/--due-date | {"flags":["--due-date"],"argument":"&lt;date&gt;"} | — |
| removed | /cli/task create/options/--final-summary | {"flags":["--final-summary"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task create/options/--modified-file | {"flags":["--modified-file"],"argument":"&lt;path&gt;"} | — |
| removed | /cli/task create/options/--no-dod-defaults | {"flags":["--no-dod-defaults"],"argument":null} | — |
| removed | /cli/task create/options/--notes | {"flags":["--notes"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task create/options/--ordinal | {"flags":["--ordinal"],"argument":"&lt;number&gt;"} | — |
| removed | /cli/task create/options/--parent,-p | {"flags":["--parent","-p"],"argument":"&lt;taskId&gt;"} | — |
| removed | /cli/task create/options/--plan | {"flags":["--plan"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task create/options/--project | {"flags":["--project"],"argument":"&lt;project&gt;"} | — |
| removed | /cli/task create/options/--ref | {"flags":["--ref"],"argument":"&lt;reference&gt;"} | — |
| removed | /cli/task demote | {"path":["task","demote"],"aliases":[],"arguments":["&lt;taskId&gt;"],"options":{"--help,-h":{"flags":["--help","-h"],"argument":null}}} | — |
| changed | /cli/task edit/arguments | ["[taskIds...]"] | ["&lt;taskIds...&gt;"] |
| removed | /cli/task edit/options/--add-ref | {"flags":["--add-ref"],"argument":"&lt;reference&gt;"} | — |
| removed | /cli/task edit/options/--append-final-summary | {"flags":["--append-final-summary"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--append-notes | {"flags":["--append-notes"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--append-plan | {"flags":["--append-plan"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--check-dod | {"flags":["--check-dod"],"argument":"&lt;index&gt;"} | — |
| removed | /cli/task edit/options/--clear-docs | {"flags":["--clear-docs"],"argument":null} | — |
| removed | /cli/task edit/options/--clear-due-date | {"flags":["--clear-due-date"],"argument":null} | — |
| removed | /cli/task edit/options/--clear-final-summary | {"flags":["--clear-final-summary"],"argument":null} | — |
| removed | /cli/task edit/options/--clear-refs | {"flags":["--clear-refs"],"argument":null} | — |
| removed | /cli/task edit/options/--dep | {"flags":["--dep"],"argument":"&lt;taskIds&gt;"} | — |
| removed | /cli/task edit/options/--desc | {"flags":["--desc"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--doc | {"flags":["--doc"],"argument":"&lt;documentation&gt;"} | — |
| removed | /cli/task edit/options/--dod | {"flags":["--dod"],"argument":"&lt;item&gt;"} | — |
| removed | /cli/task edit/options/--due-date | {"flags":["--due-date"],"argument":"&lt;date&gt;"} | — |
| removed | /cli/task edit/options/--final-summary | {"flags":["--final-summary"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--modified-file | {"flags":["--modified-file"],"argument":"&lt;path&gt;"} | — |
| removed | /cli/task edit/options/--notes | {"flags":["--notes"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--ordinal | {"flags":["--ordinal"],"argument":"&lt;number&gt;"} | — |
| removed | /cli/task edit/options/--plan | {"flags":["--plan"],"argument":"&lt;text&gt;"} | — |
| removed | /cli/task edit/options/--project | {"flags":["--project"],"argument":"&lt;project&gt;"} | — |
| removed | /cli/task edit/options/--ref | {"flags":["--ref"],"argument":"&lt;reference&gt;"} | — |
| removed | /cli/task edit/options/--remove-dod | {"flags":["--remove-dod"],"argument":"&lt;index&gt;"} | — |
| removed | /cli/task edit/options/--remove-ref | {"flags":["--remove-ref"],"argument":"&lt;reference&gt;"} | — |
| removed | /cli/task edit/options/--uncheck-dod | {"flags":["--uncheck-dod"],"argument":"&lt;index&gt;"} | — |
| removed | /cli/task list/options/--count | {"flags":["--count"],"argument":null} | — |
| removed | /cli/task list/options/--max-count | {"flags":["--max-count"],"argument":"&lt;n&gt;"} | — |
| removed | /cli/task list/options/--parent,-p | {"flags":["--parent","-p"],"argument":"&lt;taskId&gt;"} | — |
| removed | /cli/task list/options/--project | {"flags":["--project"],"argument":"&lt;project&gt;"} | — |
| removed | /cli/task list/options/--skip | {"flags":["--skip"],"argument":"&lt;n&gt;"} | — |
| removed | /mcp/resources/backlog:~1~1workflow~1overview | {"uri":"backlog://workflow/overview","description":"When to create tasks and the basic workflow","mimeType":"text/markdown","name":"Backlog Workflow Overview"} | — |
| removed | /mcp/resources/backlog:~1~1workflow~1task-creation | {"uri":"backlog://workflow/task-creation","description":"How to search, scope, and create tasks","mimeType":"text/markdown","name":"Task Creation Guide"} | — |
| removed | /mcp/resources/backlog:~1~1workflow~1task-execution | {"uri":"backlog://workflow/task-execution","description":"How to plan, update, and work through tasks","mimeType":"text/markdown","name":"Task Execution Guide"} | — |
| removed | /mcp/resources/backlog:~1~1workflow~1task-finalization | {"uri":"backlog://workflow/task-finalization","description":"How to verify, summarize, and finish work","mimeType":"text/markdown","name":"Task Finalization Guide"} | — |
| removed | /mcp/tools/definition_of_done_defaults_get | {"name":"definition_of_done_defaults_get","inputSchema":{"additionalProperties":false,"properties":{},"required":[],"type":"object"},"annotations":{"destructiveHint":false,"readOnlyHint":true,"title":"Get DoD Defaults"},"description":"Get project Definition of Done default checklist items from config"} | — |
| removed | /mcp/tools/definition_of_done_defaults_upsert | {"name":"definition_of_done_defaults_upsert","inputSchema":{"additionalProperties":false,"properties":{"items":{"description":"Project-level Definition of Done defaults (replaces existing defaults). New tasks inherit these unless disabled. Items must not contain commas.","items":{"maxLength":500,"type":"string"},"maxItems":100,"type":"array"}},"required":["items"],"type":"object"},"annotations":{"destructiveHint":false,"idempotentHint":true,"title":"Set DoD Defaults"},"description":"Replace project Definition of Done default checklist items in config"} | — |
| removed | /mcp/tools/get_backlog_instructions | {"name":"get_backlog_instructions","inputSchema":{"additionalProperties":false,"properties":{"instruction":{"enum":["overview","task-creation","task-execution","task-finalization"],"type":"string"}},"required":[],"type":"object"},"annotations":{"destructiveHint":false,"readOnlyHint":true,"title":"Backlog Instructions"},"description":"Retrieve Backlog.md workflow guidance in markdown format. Defaults to the overview when no instruction is selected."} | — |
| removed | /mcp/tools/milestone_add/inputSchema/properties/dueDate | {"description":"Optional milestone due date such as 2026-08-10; a due date names a day and carries no time","maxLength":64,"type":"string"} | — |
| removed | /mcp/tools/milestone_archive | {"name":"milestone_archive","inputSchema":{"additionalProperties":false,"properties":{"name":{"description":"Milestone name or ID to archive (case-insensitive match)","maxLength":100,"minLength":1,"type":"string"}},"required":["name"],"type":"object"},"annotations":{"destructiveHint":true,"title":"Archive Milestone"},"description":"Archive a milestone by moving it to backlog/archive/milestones"} | — |
| removed | /mcp/tools/milestone_rename/inputSchema/properties/dueDate | {"description":"Set the milestone due date such as 2026-08-10, or pass null to clear it","maxLength":64,"type":["string","null"]} | — |
| removed | /mcp/tools/task_archive | {"name":"task_archive","inputSchema":{"additionalProperties":false,"properties":{"id":{"maxLength":50,"minLength":1,"type":"string"}},"required":["id"],"type":"object"},"annotations":{"destructiveHint":true,"title":"Archive Task"},"description":"Archive a Backlog.md task"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/definitionOfDoneAdd | {"description":"Task-specific Definition of Done items to append for this task only. Do not copy project defaults here.","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/disableDefinitionOfDoneDefaults | {"description":"Disable project-level Definition of Done defaults for this task creation. Use definition_of_done_defaults_upsert to change project defaults.","type":"boolean"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/documentation | {"description":"Documentation URLs or file paths for understanding this task","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/dueDate | {"description":"Optional task due date. Use a date such as 2026-08-10. A due date names a day and carries no time.","maxLength":64,"type":"string"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/finalSummary | {"description":"Final summary for PR-style completion notes. Write this only when the task is complete.","maxLength":20000,"type":"string"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/modifiedFiles | {"description":"Project-root-relative file paths modified by this task","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/ordinal | {"description":"Optional non-negative ordering value for manual task ordering. Lower values sort earlier. Prefer spaced integers such as 1000, 2000, 3000 to leave room for inserts.","minimum":0,"type":"number"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/parentTaskId | {"description":"Existing parent task ID for a subtask. Do not pass milestone IDs here; use milestone instead.","maxLength":50,"type":"string"} | — |
| removed | /mcp/tools/task_create/inputSchema/properties/references | {"description":"Reference URLs or file paths related to this task","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| changed | /mcp/tools/task_edit/description | "Edit a Backlog.md task, including metadata (status, priority, type, project), implementation plan/notes, dependencies, acceptance criteria, and task-specific Definition of Done items" | "Edit task title, description, status, priority, type, milestone, labels, assignees, dependencies, comments, and acceptance criteria" |
| removed | /mcp/tools/task_edit/inputSchema/properties/addDocumentation | {"description":"Add documentation URLs or file paths","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/addReferences | {"description":"Add reference URLs or file paths","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/definitionOfDoneAdd | {"description":"Task-specific Definition of Done items to add for this task only. Use definition_of_done_defaults_upsert to change project defaults.","items":{"maxLength":500,"type":"string"},"maxItems":50,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/definitionOfDoneCheck | {"description":"Mark task-specific Definition of Done items as complete by 1-based index on this task.","items":{"minimum":1,"type":"number"},"maxItems":50,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/definitionOfDoneRemove | {"description":"Remove task-specific Definition of Done items by 1-based index on this task.","items":{"minimum":1,"type":"number"},"maxItems":50,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/definitionOfDoneUncheck | {"description":"Mark task-specific Definition of Done items as incomplete by 1-based index on this task.","items":{"minimum":1,"type":"number"},"maxItems":50,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/documentation | {"description":"Set documentation URLs or file paths (replaces existing)","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/dueDate | {"description":"Set the task due date, or pass null to clear it. Use a date such as 2026-08-10. A due date names a day and carries no time.","maxLength":64,"type":["string","null"]} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/finalSummary | {"description":"Final summary for PR-style completion notes. Write this only when the task is complete.","maxLength":20000,"type":"string"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/finalSummaryAppend | {"items":{"maxLength":5000,"type":"string"},"maxItems":20,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/finalSummaryClear | {"type":"boolean"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/implementationNotes | {"maxLength":10000,"type":"string"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/modifiedFiles | {"description":"Set project-root-relative modified file paths (replaces existing)","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/notesAppend | {"items":{"maxLength":5000,"type":"string"},"maxItems":20,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/notesClear | {"type":"boolean"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/notesSet | {"maxLength":20000,"type":"string"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/ordinal | {"description":"Set task ordinal for manual ordering. Lower values sort earlier. Prefer spaced integers such as 1000, 2000, 3000 to leave room for inserts.","minimum":0,"type":"number"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/planAppend | {"items":{"maxLength":5000,"type":"string"},"maxItems":20,"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/planClear | {"type":"boolean"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/planSet | {"maxLength":20000,"type":"string"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/references | {"description":"Set reference URLs or file paths (replaces existing)","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/removeDocumentation | {"description":"Remove documentation URLs or file paths","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /mcp/tools/task_edit/inputSchema/properties/removeReferences | {"description":"Remove reference URLs or file paths","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| changed | /mcp/tools/task_list/description | "List Backlog.md tasks with optional filtering by status, type, project, assignee (or unassigned: true for tasks with no assignee), milestone, labels, and search" | "List tasks with optional status, type, assignee, unassigned, milestone, labels, search, ready, and limit filters" |
| changed | /mcp/tools/task_search/description | "Search Backlog.md tasks by title, description, task type, project, and modified file path filters" | "Search tasks by query, status, task type, and priority" |
| removed | /mcp/tools/task_search/inputSchema/properties/modifiedFiles | {"description":"Filter tasks by case-insensitive substring match against modified file paths","items":{"maxLength":500,"type":"string"},"type":"array"} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1dueDate | {"path":"$/results/*/data/dueDate","types":["null"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1isReady | {"path":"$/results/*/data/isReady","types":["boolean"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1modifiedFiles | {"path":"$/results/*/data/modifiedFiles","types":["array"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1ordinal | {"path":"$/results/*/data/ordinal","types":["number"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1parentTaskId | {"path":"$/results/*/data/parentTaskId","types":["null"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1project | {"path":"$/results/*/data/project","types":["null"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1references | {"path":"$/results/*/data/references","types":["array"],"optional":true} | — |
| removed | /responses/probes/cli.search.json/fields/$~1results~1*~1data~1reporter | {"path":"$/results/*/data/reporter","types":["null"],"optional":true} | — |
| changed | /responses/probes/cli.task.create.plain/labels | ["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"] | ["Acceptance Criteria","Created","Description","Status"] |
| changed | /responses/probes/cli.task.create.plain/textForms | [["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"]] | [["Acceptance Criteria","Created","Description","Status"]] |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1dueDate | {"path":"$/tasks/*/dueDate","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1isReady | {"path":"$/tasks/*/isReady","types":["boolean"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1modifiedFiles | {"path":"$/tasks/*/modifiedFiles","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1ordinal | {"path":"$/tasks/*/ordinal","types":["number"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1parentTaskId | {"path":"$/tasks/*/parentTaskId","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1project | {"path":"$/tasks/*/project","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1references | {"path":"$/tasks/*/references","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.list.json/fields/$~1tasks~1*~1reporter | {"path":"$/tasks/*/reporter","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1definitionOfDone | {"path":"$/task/definitionOfDone","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph | {"path":"$/task/dependencyGraph","types":["object"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1edges | {"path":"$/task/dependencyGraph/edges","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1edges~1* | {"path":"$/task/dependencyGraph/edges/*","types":["object"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1edges~1*~1from | {"path":"$/task/dependencyGraph/edges/*/from","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1edges~1*~1to | {"path":"$/task/dependencyGraph/edges/*/to","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes | {"path":"$/task/dependencyGraph/nodes","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1* | {"path":"$/task/dependencyGraph/nodes/*","types":["object"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1completed | {"path":"$/task/dependencyGraph/nodes/*/completed","types":["boolean"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1dependencyDepth | {"path":"$/task/dependencyGraph/nodes/*/dependencyDepth","types":["number"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1dependentDepth | {"path":"$/task/dependencyGraph/nodes/*/dependentDepth","types":["null","number"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1id | {"path":"$/task/dependencyGraph/nodes/*/id","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1state | {"path":"$/task/dependencyGraph/nodes/*/state","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1status | {"path":"$/task/dependencyGraph/nodes/*/status","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1nodes~1*~1title | {"path":"$/task/dependencyGraph/nodes/*/title","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dependencyGraph~1root | {"path":"$/task/dependencyGraph/root","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1documentation | {"path":"$/task/documentation","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1dueDate | {"path":"$/task/dueDate","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1finalSummary | {"path":"$/task/finalSummary","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1implementationNotes | {"path":"$/task/implementationNotes","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1implementationPlan | {"path":"$/task/implementationPlan","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1isReady | {"path":"$/task/isReady","types":["boolean"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1modifiedFiles | {"path":"$/task/modifiedFiles","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1ordinal | {"path":"$/task/ordinal","types":["number"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1parentTaskId | {"path":"$/task/parentTaskId","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1path | {"path":"$/task/path","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1project | {"path":"$/task/project","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness | {"path":"$/task/readiness","types":["object"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness~1blockingDependencies | {"path":"$/task/readiness/blockingDependencies","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness~1blockingDependencies~1* | {"path":"$/task/readiness/blockingDependencies/*","types":["string"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness~1isBlocked | {"path":"$/task/readiness/isBlocked","types":["boolean"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness~1isReady | {"path":"$/task/readiness/isReady","types":["boolean"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1readiness~1missingDependencies | {"path":"$/task/readiness/missingDependencies","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1references | {"path":"$/task/references","types":["array"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1reporter | {"path":"$/task/reporter","types":["null"],"optional":false} | — |
| removed | /responses/probes/cli.task.view.json/fields/$~1task~1subtasks | {"path":"$/task/subtasks","types":["array"],"optional":false} | — |
| changed | /responses/probes/cli.task.view.plain/labels | ["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"] | ["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"] |
| changed | /responses/probes/cli.task.view.plain/textForms | [["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"],["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"]] | [["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"],["Acceptance Criteria","Created","Description","Status"]] |
| changed | /responses/probes/mcp.milestone.list/labels | ["Archived milestone values still on tasks (count)","Hint","Milestones (count)","Milestones found on tasks without files (count)"] | ["Hint","Milestones (count)","Milestones found on tasks without files (count)"] |
| changed | /responses/probes/mcp.milestone.list/textForms | [["Archived milestone values still on tasks (count)","Hint","Milestones (count)","Milestones found on tasks without files (count)"]] | [["Hint","Milestones (count)","Milestones found on tasks without files (count)"]] |
| changed | /responses/probes/mcp.milestone.rename/labels | ["Renamed milestone file","Updated 1 local task"] | ["Updated 1 local task"] |
| changed | /responses/probes/mcp.milestone.rename/textForms | [["Renamed milestone file","Updated 1 local task"]] | [["Updated 1 local task"]] |
| changed | /responses/probes/mcp.task.complete/labels | ["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Ordinal","Priority","Status","Type","Updated"] | ["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Priority","Status","Type","Updated"] |
| changed | /responses/probes/mcp.task.complete/textForms | [["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Ordinal","Priority","Status","Type","Updated"]] | [["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Priority","Status","Type","Updated"]] |
| changed | /responses/probes/mcp.task.create/labels | ["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"] | ["Acceptance Criteria","Created","Description","Status"] |
| changed | /responses/probes/mcp.task.create/textForms | [["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"]] | [["Acceptance Criteria","Created","Description","Status"]] |
| changed | /responses/probes/mcp.task.edit/labels | ["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"] | ["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"] |
| changed | /responses/probes/mcp.task.edit/textForms | [["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"],["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Ordinal","Priority","Status","Type","Updated"]] | [["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"],["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Priority","Status","Type","Updated"]] |
| changed | /responses/probes/mcp.task.view/labels | ["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"] | ["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"] |
| changed | /responses/probes/mcp.task.view/textForms | [["Acceptance Criteria","Assignee","Comments","Created","Definition of Done","Dependency Graph","Description","File","Labels","Milestone","Ordinal","Priority","Status","Type","Updated"],["Acceptance Criteria","Created","Definition of Done","Description","File","Ordinal","Status"]] | [["Acceptance Criteria","Assignee","Comments","Created","Dependencies","Description","Labels","Milestone","Priority","Status","Type","Updated"],["Acceptance Criteria","Created","Description","Status"]] |
