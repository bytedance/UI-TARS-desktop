# JSONL Format Example

JSON Lines format with auto-detection (one event per line).

## Usage

```bash
./run.sh
# or
node ../../dist/cli.js trace.jsonl
```

## Format

```jsonl
{"id":"event-1","type":"user_message","content":"..."}
{"id":"event-2","type":"assistant_message","toolCalls":[...]}
```

Auto-detected by `.jsonl` extension. Good for streaming logs.
