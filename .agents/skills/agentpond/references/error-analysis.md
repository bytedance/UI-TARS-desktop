# Error Analysis

Use AgentPond to inspect real agent traces, build a failure picture, and identify concrete improvements. Start from the focused CLI commands, then use SQL when the question requires aggregation or cross-table context.

## Basic Investigation Flow

1. Sync fresh data:

```bash
npx agentpond sync
```

2. Find recent traces:

```bash
npx agentpond traces list --limit 25
```

3. Read the trace and its timeline:

```bash
npx agentpond traces get <trace-id>
npx agentpond observations list --traceId <trace-id>
```

4. Check quality signals and annotations:

```bash
npx agentpond scores list --traceId <trace-id>
```

## SQL Investigation

Find traces with low numeric scores:

```bash
npx agentpond sql "select t.id, t.name, t.session_id, s.name as score_name, s.value, s.comment from traces t join scores s on s.trace_id = t.id where s.value is not null and s.value < 0.5 order by s.timestamp desc limit 50"
```

Inspect observation trees for a trace:

```bash
npx agentpond sql "select id, parent_observation_id, type, name, start_time, end_time, total_cost from observations where trace_id = '<trace-id>' order by start_time asc"
```

Find expensive traces:

```bash
npx agentpond sql "select id, name, user_id, session_id, total_cost, start_time from traces order by total_cost desc nulls last limit 25"
```

Find repeated sessions:

```bash
npx agentpond sql "select id, trace_count, first_seen_at, last_seen_at from sessions where trace_count > 1 order by last_seen_at desc"
```

Inspect raw payloads when projected columns do not explain the behavior:

```bash
npx agentpond sql "select event_type, event_timestamp, body_json from events_raw where entity_id = '<trace-or-observation-id>' order by event_timestamp asc"
```

## Recording Findings

When a user asks for analysis, report:

- the trace or session IDs inspected
- the commands or SQL used
- the observed failure pattern
- the likely root cause, stated separately from confirmed facts
- the smallest code, prompt, or workflow change that would address the pattern
