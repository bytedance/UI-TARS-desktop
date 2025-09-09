# Basic JSON Example

Standard JSON format processing with calculator agent.

## Usage

```bash
./run.sh
# or
node ../../dist/cli.js trace.json
```

## Format

```json
{
  "events": [
    {"id": "...", "type": "user_message", "content": "..."},
    {"id": "...", "type": "assistant_message", "toolCalls": [...]}
  ]
}
```
