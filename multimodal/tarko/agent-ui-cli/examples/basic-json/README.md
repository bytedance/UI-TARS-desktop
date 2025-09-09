# Basic JSON Format Example

This example demonstrates how to use AGUI CLI with a standard JSON trace file.

## Files

- `trace.json` - Standard JSON format with calculator demo events
- `run.sh` - One-click startup script
- `README.md` - This documentation

## What This Example Shows

- **Standard JSON Format**: Processing a trace file with `events` array containing `AgentEventStream.Event[]`
- **Calculator Agent**: An agent that uses Jupyter to perform mathematical calculations
- **Tool Calls**: How tool execution (JupyterCI) is visualized in the UI
- **Agent Thinking**: Display of the agent's reasoning process
- **Event Timeline**: Interactive timeline showing the conversation flow

## Quick Start

```bash
# Make script executable and run
chmod +x run.sh
./run.sh
```

## Manual Commands

```bash
# Basic usage
agui trace.json

# With custom output path
agui trace.json --out calculator-demo.html

# View the generated HTML in browser
open calculator-demo.html  # macOS
# or
xdg-open calculator-demo.html  # Linux
```

## Trace Content

The trace contains a conversation where:
1. User asks to calculate which is greater: 9.11 or 9.9
2. Agent thinks about the problem
3. Agent uses JupyterCI tool to write and execute Python code
4. Agent gets the result and responds to the user

## Expected Output

The generated HTML will show:
- Interactive event timeline
- User message: "Use jupyter to calculate who is greater in 9.11 and 9.9"
- Agent thinking process (expandable)
- Tool call execution with Python code
- Tool result with calculation output
- Final agent response with the answer

## File Format

The `trace.json` follows the standard format:

```json
{
  "events": [
    {
      "id": "event-id",
      "type": "user_message",
      "timestamp": 1757351879457,
      "content": "User input..."
    },
    {
      "id": "event-id",
      "type": "assistant_message",
      "timestamp": 1757351891109,
      "content": "Agent response...",
      "toolCalls": [...],
      "finishReason": "tool_calls"
    }
    // ... more events
  ]
}
```

This is the most straightforward way to use AGUI CLI - no transformers or custom configurations needed.
