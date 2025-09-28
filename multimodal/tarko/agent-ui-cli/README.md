# @tarko/agent-ui-cli

CLI for Agent UI Builder - generate and share agent replay HTML files from trace data.

## Installation

```bash
npm install @tarko/agent-ui-cli
```

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
agui ./trace.json

# Generate HTML from JSONL trace (auto-detected format)
agui ./trace.jsonl

# Specify output path
agui ./trace.json --out ./agent-ui.html
```

### With Configuration

```bash
# Use custom config (agui.config.ts will be auto-detected)
agui ./trace.json

# Specify config explicitly
agui ./trace.json --config ./agui.config.ts
```

### With Transformer

```bash
# Convert custom format using transformer
agui ./custom-format.json --transformer ./transformer.ts

# With both transformer and config
agui ./custom-format.json --transformer ./transformer.ts --config ./agui.config.ts

# Debug transformer output by saving transformed JSON
agui ./custom-format.json --transformer ./transformer.ts --dump-transformed
```

### Upload and Sharing

```bash
# Upload to sharing service
agui ./trace.json --upload http://share.example.com

# Upload with transformer
agui ./custom-format.json --transformer ./transformer.ts --upload http://share.example.com
```

### Combined Examples

```bash
# Full example with all options
agui ./custom-format.json \
  --transformer ./transformer.ts \
  --config ./agui.config.ts \
  --out ./agent-demo.html \
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
    },
    {
      "id": "event-2",
      "type": "assistant_message",
      "timestamp": 1640995201000,
      "content": "Hi there!"
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

## Transformers

Transformers convert custom trace formats to the standard `AgentEventStream.Event[]` format. The CLI supports both TypeScript (`.ts`) and JavaScript (`.js`) transformer files.

### Basic Transformer

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

### Tool Call Handling

For proper UI rendering, ensure these requirements are met:

1. **Matching Tool Call IDs**: `toolCall.id` must match `toolResult.toolCallId`
2. **Correct finishReason**: Set `"tool_calls"` when assistant makes tool calls

```typescript
const toolCallId = `tool-call-${eventIdCounter++}`;

// Tool call event
events.push({
  id: `event-${eventIdCounter++}`,
  type: 'tool_call',
  timestamp,
  toolCallId,
  name: toolName,
  arguments: parameters,
  // ... other fields
});

// Tool result event
events.push({
  id: `event-${eventIdCounter++}`,
  type: 'tool_result',
  timestamp: timestamp + 100,
  toolCallId, // Same ID as tool call
  name: toolName,
  content: result,
  // ... other fields
});

// Assistant message with tool calls
events.push({
  id: `event-${eventIdCounter++}`,
  type: 'assistant_message',
  timestamp,
  content: message,
  finishReason: 'tool_calls', // Important for UI rendering
  // ... other fields
});
```

### Type Safety Helper

Use `defineTransformer` for better TypeScript support and IntelliSense:

```typescript
import { defineTransformer } from '@tarko/agent-ui-cli';

// Type-safe transformer with custom input type
export default defineTransformer<YourCustomFormat>((input) => {
  // Transform logic here
  return { events };
});
```

## Configuration

The CLI automatically detects config files: `agui.config.{ts,js,json}` or you can specify with `--config`.

### Type-Safe Configuration

Use `defineConfig` for better TypeScript support and IntelliSense. All configuration properties support deep partial types, so you only need to specify the fields you want to override:

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
    logo: 'https://example.com/logo.png',
    guiAgent: {
      renderGUIAction: false, // Partial nested configuration
    },
  },
});
```

### Full Configuration Example

```typescript
export default {
  sessionInfo: {
    id: 'sessionId',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    workspace: '~/workspace',
    metadata: {
      name: 'Session Name',
      tags: [],
      modelConfig: {
        provider: 'volcengine',
        modelId: 'model-id',
        displayName: 'Model Name',
        configuredAt: Date.now(),
      },
      agentInfo: {
        name: 'Agent Name',
        configuredAt: Date.now(),
      },
    },
  },
  serverInfo: {
    version: '1.0.0',
    buildTime: Date.now(),
    gitHash: '1234567',
  },
  uiConfig: {
    logo: 'https://example.com/logo.png',
    title: 'Agent UI',
    subtitle: 'Agent execution replay',
    welcomTitle: 'Welcome',
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
};
```

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

## Examples

See the `examples/` directory for complete working examples:

### 🚀 Quick Start Examples

- **`examples/basic-json/`** - Standard JSON format processing
- **`examples/jsonl-format/`** - JSONL format with auto-detection
- **`examples/custom-transformer/`** - Custom formats with transformers

Each example includes:
- One-click `run.sh` script
- Detailed README with explanations
- Sample trace files
- Expected output descriptions

### Running Examples

```bash
# Run any example with one command
cd examples/basic-json && ./run.sh
cd examples/jsonl-format && ./run.sh
cd examples/custom-transformer && ./run.sh
```

For detailed documentation, see [examples/README.md](examples/README.md).
```
