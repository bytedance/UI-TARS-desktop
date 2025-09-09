# Custom Transformer Example

This example demonstrates how to use AGUI CLI with custom log formats using transformers and configurations.

## Files

- `custom-format.json` - Custom log format with calculator and weather interactions
- `transformer.ts` - TypeScript transformer to convert custom format to AgentEventStream
- `agui.config.ts` - Custom UI configuration with branding and settings
- `run.sh` - One-click startup script with all options
- `README.md` - This documentation

## What This Example Shows

- **Custom Log Format**: Processing non-standard trace formats
- **TypeScript Transformer**: Using `defineTransformer` for type-safe transformations
- **Custom Configuration**: Using `defineConfig` for UI customization
- **Debug Output**: Using `--dump-transformed` to inspect transformation results
- **Tool Call Handling**: Proper ID matching between tool calls and results
- **Multi-Tool Agent**: Agent using both calculator and weather APIs

## Quick Start

```bash
# Make script executable and run
chmod +x run.sh
./run.sh
```

## Manual Commands

```bash
# Full command with all options
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out demo.html \
  --dump-transformed

# Minimal transformer usage
agui custom-format.json --transformer transformer.ts

# Debug transformer only
agui custom-format.json --transformer transformer.ts --dump-transformed
```

## Custom Log Format

The input `custom-format.json` uses a different structure:

```json
{
  "logs": [
    {
      "type": "user_input",
      "timestamp": "2024-01-01T10:00:00.000Z",
      "message": "Help me calculate the tip..."
    },
    {
      "type": "tool_execution",
      "timestamp": "2024-01-01T10:00:01.000Z",
      "tool_name": "calculator",
      "parameters": {"expression": "85 * 0.18"},
      "result": {"result": 15.3, "formatted": "$15.30"}
    },
    {
      "type": "agent_response",
      "timestamp": "2024-01-01T10:00:04.000Z",
      "message": "For an $85 dinner bill..."
    }
  ]
}
```

## Transformer Logic

The `transformer.ts` file:

1. **Type Safety**: Uses `defineTransformer<CustomLogFormat>` for TypeScript support
2. **Event Conversion**: Converts each log entry to appropriate `AgentEventStream.Event`
3. **Tool Call Collection**: Collects tool calls within each agent loop cycle
4. **ID Matching**: Ensures `toolCall.id` matches `toolResult.toolCallId`
5. **Proper finishReason**: Sets `tool_calls` when assistant makes tool calls

### Key Transformation Features

```typescript
// Tool call collection for assistant messages
let currentLoopToolCalls: ChatCompletionMessageToolCall[] = [];

// Generate matching IDs
const toolCallId = `tool-call-${eventIdCounter++}`;

// Collect tool calls
currentLoopToolCalls.push({
  id: toolCallId,
  type: 'function',
  function: {
    name: toolName,
    arguments: JSON.stringify(parameters)
  }
});

// Use in both tool_call and tool_result events
toolCallId: toolCallId  // Same ID ensures proper UI linking
```

## Custom Configuration

The `agui.config.ts` file demonstrates:

```typescript
import { defineConfig } from '@tarko/agent-ui-cli';

export default defineConfig({
  sessionInfo: {
    metadata: {
      name: 'Calculator and Weather Demo',
      tags: ['demo', 'calculator', 'weather']
    }
  },
  uiConfig: {
    title: 'Demo Agent UI',
    subtitle: 'Calculator and Weather Assistant Demo',
    logo: 'https://example.com/logo.png'
  }
});
```

## Debug Output

The `--dump-transformed` flag creates `custom-format-transformed.json` containing:

```json
{
  "events": [
    {
      "id": "event-1",
      "type": "user_message",
      "timestamp": 1704110400000,
      "content": "Help me calculate the tip..."
    }
    // ... transformed events in standard format
  ]
}
```

## Expected Output

The generated HTML will show:

1. **Custom Branding**: Logo, title, and subtitle from config
2. **Calculator Interaction**: Tip calculation with tool calls
3. **Weather Query**: San Francisco weather with API results
4. **Tool Visualization**: Proper tool call → result linking
5. **Agent Thinking**: Thinking process display
6. **Timeline**: Interactive event timeline

## Debugging Tips

1. **Check Transformation**: Examine `custom-format-transformed.json` for issues
2. **Tool Call IDs**: Ensure `toolCallId` matches between call and result events
3. **finishReason**: Set to `tool_calls` when assistant makes tool calls
4. **Event Order**: Maintain proper chronological order
5. **Type Safety**: Use TypeScript interfaces for better error catching

## When to Use Custom Transformers

- **Legacy Systems**: Converting existing log formats
- **Third-party Tools**: Integrating logs from external systems
- **Custom Agents**: When your agent uses non-standard event structures
- **Data Migration**: Converting between different trace formats
- **Integration**: Combining multiple log sources

## Advanced Features

- **Type Safety**: Full TypeScript support with `defineTransformer`
- **Tool Call Grouping**: Automatic collection within agent loops
- **Timestamp Conversion**: Flexible timestamp handling
- **Error Handling**: Graceful handling of missing or malformed data
- **Extensibility**: Easy to modify for different custom formats
