# JSONL Format Example

This example demonstrates how to use AGUI CLI with JSONL (JSON Lines) trace files.

## Files

- `trace.jsonl` - JSONL format with the same calculator demo events as basic-json
- `run.sh` - One-click startup script
- `README.md` - This documentation

## What This Example Shows

- **JSONL Format**: Processing JSON Lines format where each line is a separate event
- **Auto-Detection**: CLI automatically detects `.jsonl` extension and processes accordingly
- **Streaming-Friendly**: JSONL is ideal for streaming logs and real-time processing
- **Same Content**: Identical agent behavior to basic-json example, just different file format

## Quick Start

```bash
# Make script executable and run
chmod +x run.sh
./run.sh
```

## Manual Commands

```bash
# Basic usage (auto-detects JSONL format)
agui trace.jsonl

# With custom output path
agui trace.jsonl --out jsonl-calculator-demo.html

# View the generated HTML in browser
open jsonl-calculator-demo.html  # macOS
# or
xdg-open jsonl-calculator-demo.html  # Linux
```

## JSONL vs JSON Format

### JSONL Format (this example)
```jsonl
{"id":"event-1","type":"user_message","timestamp":1757351879457,"content":"Use jupyter..."}
{"id":"event-2","type":"agent_run_start","timestamp":1757351879447,"sessionId":"3ZZp7adHwAe2e8QlUWM1B"}
{"id":"event-3","type":"assistant_thinking_message","timestamp":1757351888296,"content":"Got it..."}
```

### JSON Format (basic-json example)
```json
{
  "events": [
    {"id":"event-1","type":"user_message","timestamp":1757351879457,"content":"Use jupyter..."},
    {"id":"event-2","type":"agent_run_start","timestamp":1757351879447,"sessionId":"3ZZp7adHwAe2e8QlUWM1B"},
    {"id":"event-3","type":"assistant_thinking_message","timestamp":1757351888296,"content":"Got it..."}
  ]
}
```

## Advantages of JSONL

1. **Streaming**: Each line can be processed as it arrives
2. **Append-Only**: Easy to append new events without modifying existing content
3. **Memory Efficient**: Can process large files line by line
4. **Tool Friendly**: Many log processing tools work well with line-based formats
5. **Fault Tolerant**: Corrupted lines don't affect other events

## Processing Details

The CLI automatically:
1. Detects `.jsonl` file extension
2. Reads the file line by line
3. Parses each line as a separate JSON event
4. Constructs an `events` array internally
5. Processes it the same way as standard JSON format

## Expected Output

The generated HTML will be identical to the basic-json example, showing:
- Interactive event timeline
- Calculator agent conversation
- Tool execution visualization
- Same user experience regardless of input format

## When to Use JSONL

- **Real-time logging**: When events are generated continuously
- **Large datasets**: When memory usage is a concern
- **Streaming applications**: When processing events as they arrive
- **Log aggregation**: When combining logs from multiple sources
- **Debugging**: When you need to examine individual events easily
