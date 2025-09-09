# AGUI CLI Examples - Dump

This directory contains examples for testing the `agui` CLI dump functionality.

## Files

### Trace Files
- `trace.json` - Standard JSON format with calculator demo events
- `trace.jsonl` - JSONL format with weather demo events
- `custom-format.json` - Custom log format for transformer demo

### Configuration
- `agui.config.ts` - Example configuration with custom session info and UI settings (uses `defineConfig` for type safety)
- `transformer.ts` - Example transformer for converting custom log format (uses `defineTransformer` for type safety)

## CLI Options

The `agui` CLI supports the following options:

- `--out <path>` - Output file path for the generated HTML
- `--transformer <path>` - Path to transformer file (TypeScript or JavaScript)
- `--config <path>` - Path to config file
- `--upload <url>` - Upload URL for sharing (generates and uploads HTML)
- `--dump-transformed` - Dump transformed JSON to file (requires `--transformer`)

## Usage Examples

### Basic Usage
```bash
# Generate HTML from JSON trace
agui trace.json

# Generate HTML from JSONL trace (auto-detected format)
agui trace.jsonl

# Specify output path
agui trace.json --out calculator-demo.html
```

### With Configuration
```bash
# Use custom config (agui.config.ts will be auto-detected)
agui trace.json

# Specify config explicitly
agui trace.json --config agui.config.ts
```

### With Transformer
```bash
# Convert custom format using transformer
agui custom-format.json --transformer transformer.ts

# With both transformer and config
agui custom-format.json --transformer transformer.ts --config agui.config.ts

# Debug transformer output by saving transformed JSON
agui custom-format.json --transformer transformer.ts --dump-transformed
```

### Upload and Sharing
```bash
# Upload to sharing service
agui trace.json --upload http://share.example.com

# Upload with transformer
agui custom-format.json --transformer transformer.ts --upload http://share.example.com
```

### Combined Examples
```bash
# Full example with all options
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out currency-converter-demo.html \
  --dump-transformed
```

## File Format Support

### JSON Format
Standard JSON files with an `events` array containing `AgentEventStream.Event[]`:
```json
{
  "events": [
    {
      "id": "event-1",
      "type": "user_message",
      "timestamp": 1640995200000,
      "content": "Hello"
    }
  ]
}
```

### JSONL Format
JSON Lines format where each line is a separate event (auto-detected by `.jsonl` extension):
```jsonl
{"id": "event-1", "type": "user_message", "timestamp": 1640995200000, "content": "Hello"}
{"id": "event-2", "type": "assistant_message", "timestamp": 1640995201000, "content": "Hi there!"}
```

### Custom Formats
Any format can be supported using transformers that convert to `AgentEventStream.Event[]`.

## Expected Output

### HTML Generation
All commands will generate HTML files that can be opened in a browser to view the agent execution replay with:
- Interactive event timeline
- Tool call details
- Agent thinking process
- Custom UI configuration (title, logo, etc.)

### Transformed JSON Output
When using `--dump-transformed`, a JSON file will be created alongside the HTML:
- Input: `custom-format.json` → Output: `custom-format-transformed.json`
- Input: `trace.jsonl` → Output: `trace-transformed.json`
- Contains the standardized `AgentEventStream.Event[]` format
- Useful for debugging transformer logic

## Testing the Examples

From the `examples/dump` directory:

```bash
# Test basic JSON format
agui trace.json --out test-json.html

# Test JSONL format
agui trace.jsonl --out test-jsonl.html

# Test transformer with debug output
agui custom-format.json --transformer transformer.ts --out test-transformer.html --dump-transformed

# Test with full configuration
agui trace.json --config agui.config.ts --out test-config.html

# Test upload functionality (requires valid upload URL)
# agui trace.json --upload http://your-share-service.com
```

## Type Safety Helpers

AGUI CLI provides helper functions for better TypeScript support:

### defineConfig
Use `defineConfig` in your config files for type safety and IntelliSense. All configuration properties support deep partial types, so you only need to specify the fields you want to override:

```typescript
import { defineConfig } from '@tarko/agent-ui-cli';

export default defineConfig({
  sessionInfo: {
    metadata: {
      name: 'My Custom Agent',
      // Only specify the fields you want to override
      modelConfig: {
        provider: 'openai', // Other fields will use defaults
      },
    },
  },
  uiConfig: {
    title: 'My Agent UI',
    guiAgent: {
      renderGUIAction: false, // Partial nested configuration
    },
  },
});
```

### defineTransformer
Use `defineTransformer` for type-safe transformers that convert custom log formats to AgentEventStream events. The CLI supports both TypeScript (`.ts`) and JavaScript (`.js`) transformer files:

```typescript
import { AgentEventStream } from '@tarko/interface';
import { defineTransformer } from '@tarko/agent-ui-cli';

interface CustomLogEntry {
  type: 'user_input' | 'tool_execution' | 'agent_response';
  timestamp: string;
  message?: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  result?: Record<string, any>;
}

interface CustomLogFormat {
  logs: CustomLogEntry[];
}

export default defineTransformer<CustomLogFormat>((input) => {
  const events: AgentEventStream.Event[] = [];
  let eventIdCounter = 1;

  for (const log of input.logs) {
    const timestamp = new Date(log.timestamp).getTime();
    
    if (log.type === 'user_input') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'user_message',
        timestamp,
        content: log.message || '',
      } as AgentEventStream.UserMessageEvent);
    }
    // Add more event type conversions...
  }

  return { events };
});
```

#### Tool Call Collection

The transformer automatically collects tool calls within each agent loop cycle:

```typescript
// Track tool calls in the current agent loop
let currentLoopToolCalls: ChatCompletionMessageToolCall[] = [];

// When processing tool_execution events
if (log.type === 'tool_execution') {
  // Collect tool call for the assistant message
  currentLoopToolCalls.push({
    id: toolCallId,
    type: 'function',
    function: {
      name: toolName,
      arguments: JSON.stringify(log.parameters || {}),
    },
  });
}

// When processing agent_response events
if (log.type === 'agent_response') {
  // Include all collected tool calls
  toolCalls: currentLoopToolCalls.length > 0 ? currentLoopToolCalls : undefined,
  
  // Reset for next loop
  currentLoopToolCalls = [];
}
```

This ensures that `AssistantMessageEvent.toolCalls` contains all tools that were called before the assistant's response, matching the actual conversation flow.

#### Critical Tool Call Requirements

For proper UI rendering, ensure these requirements are met:

1. **Matching Tool Call IDs**: `toolCall.id` must match `toolResult.toolCallId`
```typescript
const toolCallId = `tool-call-${eventIdCounter++}`; // Generate once

// Use same ID in both events
toolCall: { toolCallId },
toolResult: { toolCallId }
```

2. **Correct finishReason**: Set `"tool_calls"` when assistant makes tool calls
```typescript
finishReason: currentLoopToolCalls.length > 0 ? 'tool_calls' : 'stop'
```

Without these, tool call blocks will show as "executing" indefinitely and side panels won't update.

## Debugging and Troubleshooting

### Using --dump-transformed for Debugging
The `--dump-transformed` flag is invaluable for debugging transformer logic:

```bash
# Debug your transformer output
agui custom-format.json --transformer transformer.ts --dump-transformed

# This creates custom-format-transformed.json with the standardized events
# Compare this with your expected output to debug transformation issues
```

### Common Issues

1. **Tool calls show as "executing" forever**
   - Ensure `toolCall.id` matches `toolResult.toolCallId`
   - Set `finishReason: 'tool_calls'` when assistant makes tool calls

2. **JSONL files not loading**
   - Ensure file has `.jsonl` extension for auto-detection
   - Check that each line contains valid JSON

3. **Transformer not found**
   - Verify the transformer file path is correct
   - Ensure the transformer exports a default function

4. **TypeScript transformer compilation errors**
   - The CLI uses `jiti` to load TypeScript files automatically
   - No need to compile `.ts` files manually

### Validation
The CLI automatically validates that transformed data contains:
- An `events` array
- Valid `AgentEventStream.Event[]` structure

Use `--dump-transformed` to inspect the final event structure before HTML generation.
