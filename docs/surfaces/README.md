# Runtime surface baseline and reports

The baseline records the existing mini contract accepted in issues #1, #2, #5 and #8 and documented in `README.md:L27-L93`. This PR proposes the captured baseline for review; merging the baseline change is the explicit approval action. Capture and comparison never grant approval.

## Identified inputs

| File | Build source | Observed CLI/MCP version |
| --- | --- | --- |
| `mini-v1.53.0.json` | Compiled mini commit `baf842ef6cadcd5a3197bde22cddea47d4a2bb1e` | `1.53.0` |
| `candidate-v1.53.0.json` | Independent capture of that same compiled mini commit, demonstrating a candidate without drift | `1.53.0` |
| `upstream-v1.52.0.json` | Compiled pristine upstream tag `v1.52.0`, commit `39912b864053dcdd1fafc458aacde43ffd616a0c` | `1.51.0` |
| `upstream-v1.53.0.json` | Compiled pristine upstream tag `v1.53.0`, commit `fd20f71493fb4eda44b021aa89f257956f17fb71` | `1.52.0` |

The upstream tag names and embedded versions differ. Both are retained honestly; no version override was applied. Source identity is supplied by the caller, while version and surface are observed from the executable. The snapshots' `identity` objects are the evidence for this table. The fork's internal full-mode test harness was not used for these upstream captures.

Each snapshot uses manifest version 2 and response profile 1. Discovery projects and response fixtures used the fixed public initialization settings described in `docs/runtime-surface-capture.md:L35-L55`. The fixture is generated through public commands and tools; it requires no checked-in task files, hand-picked IDs or source imports.

## Approval scope

The mini baseline contains 24 CLI entries and the 15 documented MCP tools. MCP resources, templates and prompts are empty. The captured task JSON matches the documented summary/detail fields. Task/milestone archive and due-date interfaces remain excluded; the full browser remains the human-facing exception. Sources: `mini-v1.53.0.json`, `README.md:L27-L93`, issues #1/#2/#5/#8. Browser routes and instruction prose are outside this manifest, so their existing tests remain necessary.

For a deliberate contract change, capture to a new candidate file, review the report against the existing baseline, update the public documentation and behavioral tests, and replace the baseline in an explicit reviewed PR. State the accepted changes and the build identity in the PR. Never copy a candidate over the baseline as a sync or CI step. A version/revision change alone does not approve or flag API changes; comparisons exclude identity metadata (issue #12).

## Three comparisons

From the repository root:

```bash
bun scripts/compare-surfaces.ts --before docs/surfaces/upstream-v1.52.0.json --after docs/surfaces/upstream-v1.53.0.json --output docs/surfaces/reports/upstream-changes
bun scripts/compare-surfaces.ts --before docs/surfaces/upstream-v1.53.0.json --after docs/surfaces/candidate-v1.53.0.json --output docs/surfaces/reports/upstream-to-mini
bun scripts/compare-surfaces.ts --before docs/surfaces/mini-v1.53.0.json --after docs/surfaces/candidate-v1.53.0.json --output docs/surfaces/reports/mini-candidate --fail-on-drift
```

The committed JSON/Markdown reports retain additions, removals and changes to schema constraints and observed response shapes. Command, option, MCP and response-field identities are compared by key, avoiding misleading array-index shifts. Arrays within schemas retain their advertised order. Malformed/incomplete snapshots, duplicate identities and incompatible manifest/profile versions fail visibly; response profile 1 requires all 23 probes (issue #12).

`--fail-on-drift` exits nonzero after writing the report when differences exist. Without it, differences are review evidence and do not fail the command. Report outputs cannot overwrite the supplied input manifests. Reports contain no capture time; repeated comparisons of the same inputs produce identical content. These reports describe observed differences and do not automatically classify them as acceptable or breaking.

Use the three report pairs separately: upstream changes explain new source work; upstream-to-mini shows the fork's deliberate difference; mini-to-candidate checks whether synchronization preserved mini. Git diffs may explain implementation changes, but the reports derive public surfaces from runtime captures (issue #12; PR #9).
