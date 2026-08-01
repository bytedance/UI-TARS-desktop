---
name: agentpond
description: Inspect and analyze AgentPond traces, observations, sessions, and scores with focused CLI commands and DuckDB SQL. Use when investigating agent behavior, querying trace data, comparing sessions, reviewing annotations, or diagnosing failures after traces have already been collected.
---

# AgentPond trace analytics

Use AgentPond to inspect collected trace data.

Read only the references relevant to the current task. Provider-specific
references are authoritative for project selection, target selection, and
credential access:

- Provider-neutral query commands: [references/cli.md](references/cli.md)
- Firebase data access: [references/firebase.md](references/firebase.md)
- Supabase data access: [references/supabase.md](references/supabase.md)
- Vercel data access: [references/vercel.md](references/vercel.md)
- DuckDB tables and SQL examples: [references/duckdb-schema.md](references/duckdb-schema.md)
- Trace investigation workflow: [references/error-analysis.md](references/error-analysis.md)

## Select the data source

Determine the provider before syncing:

- For a Firebase project, read [references/firebase.md](references/firebase.md).
- For a Supabase project, read [references/supabase.md](references/supabase.md).
- For a Vercel-linked project, read [references/vercel.md](references/vercel.md).
- Otherwise, use an existing manual AgentPond environment. Every manual
  environment is backed by a supported Node-compatible Files SDK provider, as
  described in [references/cli.md](references/cli.md). Azure Blob, Netlify
  Blobs, and Oracle Cloud environments use their corresponding Files SDK
  adapters.

Do not create provider-choice state. Select the provider's environment with
`npx agentpond env use <name>`: a Firebase alias or project ID, a Supabase
project ref, an exact Vercel target, or a manual AgentPond environment. Use
`--env <name>` only for a one-command override. Confirm the selection with
`npx agentpond env current`. If multiple provider markers are present, add the
stateless `--platform firebase`, `--platform supabase`, or `--platform vercel`
override to each AgentPond command.

## Inspect traces

Start with focused commands:

```bash
npx agentpond traces list --limit 25
npx agentpond traces get <trace-id>
npx agentpond observations list --traceId <trace-id>
npx agentpond scores list --traceId <trace-id>
```

Inspect a session when behavior spans multiple traces:

```bash
npx agentpond sessions list
npx agentpond sessions get <session-id>
```

Use SQL for joins, aggregation, time windows, raw event inspection, or cost analysis:

```bash
npx agentpond sql "select id, name, session_id, total_cost from traces order by start_time desc limit 10"
```

## Report findings

Separate confirmed observations from inference. Include the provider and target inspected, trace or session IDs, commands or SQL used, the observed pattern, the likely cause, and the smallest useful code, prompt, or workflow change.
