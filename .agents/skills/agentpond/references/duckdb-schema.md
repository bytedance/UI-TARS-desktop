# DuckDB Schema

AgentPond stores raw accepted events and projected analysis tables in the configured DuckDB cache. Use `npx agentpond sync` before querying when object storage may contain new events.

## Queryable Structures

`events_raw` keeps every accepted event payload:

```text
event_id TEXT PRIMARY KEY
project_id TEXT
manifest_key TEXT
object_key TEXT
event_type TEXT
event_timestamp TIMESTAMP
entity_id TEXT
body_json TEXT
event_json TEXT
```

`events_raw.body_json` and `events_raw.event_json` can contain the complete raw
telemetry payload. The projected `traces.input_json`, `traces.output_json`,
`observations.input_json`, and `observations.output_json` fields can also contain
prompts, responses, tool arguments, tool results, or provider error details.
Treat these columns as sensitive: do not paste them into issues, review
comments, logs, or reports. Select only the fields needed for the analysis and
redact values before sharing query output.

`traces` contains projected trace rows:

```text
id TEXT PRIMARY KEY
project_id TEXT
name TEXT
user_id TEXT
session_id TEXT
start_time TIMESTAMP
end_time TIMESTAMP
metadata_json TEXT
input_json TEXT
output_json TEXT
total_cost DOUBLE
updated_at TIMESTAMP
```

`observations` contains projected span, generation, and observation rows:

```text
id TEXT PRIMARY KEY
project_id TEXT
trace_id TEXT
parent_observation_id TEXT
type TEXT
name TEXT
start_time TIMESTAMP
end_time TIMESTAMP
metadata_json TEXT
input_json TEXT
output_json TEXT
usage_details_json TEXT
cost_details_json TEXT
total_cost DOUBLE
updated_at TIMESTAMP
```

`scores` contains projected trace, observation, and session scores:

```text
id TEXT PRIMARY KEY
project_id TEXT
trace_id TEXT
observation_id TEXT
session_id TEXT
name TEXT
value DOUBLE
string_value TEXT
data_type TEXT
source TEXT
comment TEXT
metadata_json TEXT
timestamp TIMESTAMP
updated_at TIMESTAMP
```

`sessions` is a view derived from traces with session IDs:

```text
id TEXT
project_id TEXT
first_seen_at TIMESTAMP
last_seen_at TIMESTAMP
trace_count BIGINT
```

## SQL Patterns

Recent high-cost traces:

```bash
npx agentpond sql "select id, name, session_id, total_cost from traces order by total_cost desc nulls last limit 20"
```

Observation timeline for one trace:

```bash
npx agentpond sql "select id, parent_observation_id, type, name, start_time, end_time, total_cost from observations where trace_id = '<trace-id>' order by start_time asc"
```

Scores attached to a trace:

```bash
npx agentpond sql "select name, value, string_value, data_type, source, comment, timestamp from scores where trace_id = '<trace-id>' order by timestamp desc"
```

Sessions with repeated trace activity:

```bash
npx agentpond sql "select id, trace_count, first_seen_at, last_seen_at from sessions order by trace_count desc, last_seen_at desc limit 20"
```

Raw event inspection:

```bash
npx agentpond sql "select event_type, event_timestamp, entity_id, body_json from events_raw where entity_id = '<entity-id>' order by event_timestamp asc"
```

JSON columns are stored as text. Use DuckDB JSON functions when a query needs fields inside `metadata_json`, `input_json`, `output_json`, `usage_details_json`, `cost_details_json`, `body_json`, or `event_json`.
