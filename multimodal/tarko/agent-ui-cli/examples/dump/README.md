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

## Usage Examples

### Basic Usage
```bash
# Generate HTML from JSON trace
agui trace.json

# Generate HTML from JSONL trace
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
```

### Combined Examples
```bash
# Full example with all options
agui custom-format.json \
  --transformer transformer.ts \
  --config agui.config.ts \
  --out currency-converter-demo.html
```

## Expected Output

All commands will generate HTML files that can be opened in a browser to view the agent execution replay with:
- Interactive event timeline
- Tool call details
- Agent thinking process
- Custom UI configuration (title, logo, etc.)

## Testing the Examples

From the `examples/dump` directory:

```bash
# Test basic JSON format
agui trace.json --out test-json.html

# Test JSONL format
agui trace.jsonl --out test-jsonl.html

# Test transformer
agui custom-format.json --transformer transformer.ts --out test-transformer.html

# Test with full configuration
agui trace.json --config agui.config.ts --out test-config.html
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
Use `defineTransformer` for type-safe transformers that convert custom log formats to AgentEventStream events:

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
    } else if (log.type === 'agent_response') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_message',
        timestamp,
        content: log.message || '',
        rawContent: log.message,
        toolCalls: log.parameters?.toolCalls,
        finishReason: log.parameters?.finishReason || 'stop',
        ttftMs: log.parameters?.ttftMs,
        ttltMs: log.parameters?.ttltMs,
        messageId: log.parameters?.messageId || `msg-${eventIdCounter}`,
      } as AgentEventStream.AssistantMessageEvent);
    } else if (log.type === 'agent_thinking') {
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'assistant_thinking_message',
        timestamp,
        content: log.message || '',
        isComplete: log.parameters?.isComplete ?? true,
        thinkingDurationMs: log.parameters?.thinkingDurationMs,
        messageId: log.parameters?.messageId || `thinking-${eventIdCounter}`,
      } as AgentEventStream.AssistantThinkingMessageEvent);
    } else if (log.type === 'tool_execution') {
      const toolCallId = `tool-call-${eventIdCounter}`;
      
      // Tool call event
      events.push({
        id: `event-${eventIdCounter++}`,
        type: 'tool_call',
        timestamp,
        toolCallId,
        name: log.tool_name || 'unknown_tool',
        arguments: log.parameters || {},
        startTime: timestamp,
        tool: {
          name: log.tool_name || 'unknown_tool',
          description: `Tool: ${log.tool_name}`,
          schema: {},
        },
      } as AgentEventStream.ToolCallEvent);
      
      // Tool result event
      if (log.result) {
        events.push({
          id: `event-${eventIdCounter++}`,
          type: 'tool_result',
          timestamp: timestamp + 100,
          toolCallId,
          name: log.tool_name || 'unknown_tool',
          content: log.result,
          elapsedMs: 100,
        } as AgentEventStream.ToolResultEvent);
      }
    }
  }

  return { events };
});
```
