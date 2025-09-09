# Agent Trace JSONL Transformer

This example demonstrates how to transform agent trace data from JSONL format to AgentEventStream format using the AGUI CLI.

## Overview

The `agent_trace.jsonl` file contains OpenTelemetry-style span events from an agent execution trace. The `transformer.ts` converts these events into the standardized AgentEventStream format for visualization.

## Usage

### Prerequisites

1. Build the AGUI CLI:
   ```bash
   cd multimodal/tarko/agent-ui-cli
   npm run build
   ```

### Generate HTML Report

```bash
cd multimodal/tarko/agent-ui-cli/examples/test
node ../../dist/cli.js agent_trace.jsonl --transformer transformer.ts --out agent_trace.html
```

### Command Options

- `agent_trace.jsonl`: Input JSONL file (auto-detected format)
- `--transformer transformer.ts`: TypeScript transformer file
- `--out agent_trace.html`: Output HTML file path

## Files

- **`agent_trace.jsonl`**: Source trace data in JSONL format
- **`transformer.ts`**: Converts OpenTelemetry spans to AgentEventStream events
- **`event-stream-comparison.md`**: Detailed analysis of format differences
- **`agent_trace.html`**: Generated HTML visualization (after running command)

## Transformer Features

The transformer handles:

1. **LLM Calls**: Converts to `assistant_message` events
2. **Function Calls**: Parses `<function=name>` syntax to `tool_call` events
3. **Tool Results**: Maps execution results to `tool_result` events
4. **Agent Steps**: Creates `agent_run_start` and `agent_run_end` events
5. **Thinking**: Extracts `think` tool calls to `assistant_thinking_message` events

## Event Mapping

| Source Span Name | Target Event Type |
|------------------|-------------------|
| `llm` | `assistant_message` + `tool_call` |
| `parse_tool_calls` | `tool_call` |
| `portal.run_action` | `tool_result` |
| `execute_bash` | `tool_result` |
| `str_replace_editor` | `tool_result` |
| `think` | `assistant_thinking_message` |
| `agent_step` | `agent_run_start` / `agent_run_end` |

## Function Call Parsing

The transformer automatically parses function calls embedded in LLM responses:

```xml
<function=execute_bash>
<parameter=command>pwd && ls</parameter>
</function>
```

Converts to structured tool calls:

```json
{
  "id": "tool-call-123",
  "type": "function",
  "function": {
    "name": "execute_bash",
    "arguments": "{\"command\": \"pwd && ls\"}"
  }
}
```

## Viewing Results

Open the generated `agent_trace.html` file in a web browser to view the interactive agent execution timeline.
