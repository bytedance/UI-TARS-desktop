# @tarko/agent-interface

Standard protocol, types, event stream and other specifications for `@tarko/agent`

## Installation

```bash
npm install @tarko/agent-interface
```

## Overview

The `@tarko/agent-interface` package provides the core types, interfaces, and event stream specifications for building intelligent agents in the `@tarko/agent` framework. It serves as the foundation for agent communication, tool integration, and real-time event processing.

## Key Components

### Agent Interface (`IAgent`)

The core interface that all agent implementations must implement:

```typescript
import { IAgent, AgentOptions } from '@tarko/agent-interface';

class MyAgent implements IAgent {
  async initialize() {
    // Initialize your agent
  }

  async run(input: string) {
    // Execute agent logic
  }

  // ... other required methods
}
```

### Agent Options

Comprehensive configuration options for agent behavior:

```typescript
import { AgentOptions } from '@tarko/agent-interface';

const options: AgentOptions = {
  // Base configuration
  id: 'my-agent',
  name: 'My Custom Agent',
  instructions: 'You are a helpful assistant...',

  // Model configuration
  model: {
    provider: 'openai',
    id: 'gpt-4',
  },
  maxTokens: 4096,
  temperature: 0.7,

  // Tool configuration
  tools: [
    {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      schema: z.object({
        expression: z.string(),
      }),
      function: async (args) => {
        // Tool implementation
      },
    },
  ],

  // Loop control
  maxIterations: 50,

  // Memory and context
  context: {
    maxImagesCount: 10,
  },
  eventStreamOptions: {
    maxEvents: 1000,
    autoTrim: true,
  },

  // Logging
  logLevel: LogLevel.INFO,
};
```

### Tool System

Define and register tools for agent capabilities:

```typescript
import { Tool } from '@tarko/agent-interface';
import { z } from 'zod';

const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  schema: z.object({
    location: z.string().describe('The city and state/country'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  function: async ({ location, unit }) => {
    // Fetch weather data
    return {
      location,
      temperature: 22,
      unit,
      condition: 'sunny',
    };
  },
};
```

## Event Stream

The event stream system provides real-time visibility into agent execution, conversation flow, and internal reasoning processes. It's designed for both monitoring and building reactive user interfaces.

### Core Event Types

The event stream supports various categories of events:

#### Conversation Events
- `user_message` - User input to the agent
- `assistant_message` - Agent's response
- `assistant_thinking_message` - Agent's reasoning process

#### Streaming Events
- `assistant_streaming_message` - Real-time content updates
- `assistant_streaming_thinking_message` - Real-time reasoning updates
- `final_answer_streaming` - Streaming final answers

#### Tool Execution Events
- `tool_call` - Tool invocation
- `tool_result` - Tool execution result

#### Planning Events
- `plan_start` - Beginning of planning session
- `plan_update` - Plan state changes
- `plan_finish` - Completion of plan

#### System Events
- `system` - Logs, warnings, errors
- `agent_run_start` - Agent execution start
- `agent_run_end` - Agent execution completion
- `environment_input` - External context injection
- `final_answer` - Structured final response

### Using the Event Stream

#### Basic Event Subscription

```typescript
import { AgentEventStream } from '@tarko/agent-interface';

// Get the event stream from your agent
const eventStream = agent.getEventStream();

// Subscribe to all events
const unsubscribe = eventStream.subscribe((event) => {
  console.log('Event:', event.type, event);
});

// Subscribe to specific event types
const unsubscribeSpecific = eventStream.subscribeToTypes(
  ['assistant_message', 'tool_call'],
  (event) => {
    console.log('Specific event:', event);
  }
);

// Subscribe to streaming events only
const unsubscribeStreaming = eventStream.subscribeToStreamingEvents((event) => {
  if (event.type === 'assistant_streaming_message') {
    process.stdout.write(event.content);
  }
});
```

#### Event Stream Processing

```typescript
// Create custom events
const customEvent = eventStream.createEvent('user_message', {
  content: 'Hello, agent!',
});

// Send events manually
eventStream.sendEvent(customEvent);

// Query historical events
const recentEvents = eventStream.getEvents(['assistant_message'], 10);
const toolEvents = eventStream.getEventsByType(['tool_call', 'tool_result']);

// Get recent tool results
const toolResults = eventStream.getLatestToolResults();
```

#### Streaming Agent Execution

```typescript
// Run agent in streaming mode
const streamingEvents = await agent.run({
  input: 'Analyze the weather data and create a report',
  stream: true,
});

// Process streaming events
for await (const event of streamingEvents) {
  switch (event.type) {
    case 'assistant_streaming_message':
      // Update UI with incremental content
      updateMessageUI(event.messageId, event.content);
      break;

    case 'assistant_streaming_thinking_message':
      // Show reasoning process
      updateThinkingUI(event.content);
      break;

    case 'tool_call':
      // Show tool being executed
      showToolExecution(event.name, event.arguments);
      break;

    case 'final_answer':
      // Display final structured answer
      showFinalAnswer(event.content, event.format);
      break;
  }
}
```

### Custom Event Extensions

Extend the event system with custom event types:

```typescript
// Define custom event interface
interface MyCustomEventInterface extends AgentEventStream.BaseEvent {
  type: 'custom_analysis';
  analysisType: 'sentiment' | 'classification';
  confidence: number;
  result: any;
}

// Extend the event mapping through module augmentation
declare module '@tarko/agent-interface' {
  namespace AgentEventStream {
    interface ExtendedEventMapping {
      custom_analysis: MyCustomEventInterface;
    }
  }
}

// Now you can use the custom event type
const customEvent = eventStream.createEvent('custom_analysis', {
  analysisType: 'sentiment',
  confidence: 0.95,
  result: { sentiment: 'positive', score: 0.85 },
});

// Type-safe subscription
eventStream.subscribeToTypes(['custom_analysis'], (event) => {
  // TypeScript knows this is MyCustomEventInterface
  console.log('Analysis result:', event.result);
});
```

### Event Stream Configuration

Configure event stream behavior:

```typescript
const eventStreamOptions: AgentEventStream.ProcessorOptions = {
  maxEvents: 1000,        // Keep last 1000 events in memory
  autoTrim: true,         // Automatically remove old events
};

const agentOptions: AgentOptions = {
  eventStreamOptions,
  // ... other options
};
```

## Agent Run Options

### Basic Text Input

```typescript
// Simple string input
const response = await agent.run('What is the weather in New York?');
console.log(response.content);
```

### Advanced Options

```typescript
// Object-based options with configuration
const response = await agent.run({
  input: [
    { type: 'text', text: 'Analyze this image:' },
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } },
  ],
  model: 'gpt-4-vision-preview',
  provider: 'openai',
  sessionId: 'conversation-123',
  toolCallEngine: 'native',
});
```

### Streaming Mode

```typescript
// Enable streaming for real-time updates
const events = await agent.run({
  input: 'Create a detailed analysis report',
  stream: true,
});

for await (const event of events) {
  // Handle streaming events
}
```

## Tool Call Engines

Configure how tools are executed:

### Native Engine (Default)
Uses LLM's built-in function calling capabilities:

```typescript
const options: AgentOptions = {
  toolCallEngine: 'native',
  tools: [weatherTool],
};
```

### Prompt Engineering Engine
Uses prompt-based tool calling for models without native function calling:

```typescript
const options: AgentOptions = {
  toolCallEngine: 'prompt_engineering',
  tools: [weatherTool],
};
```

### Structured Outputs Engine
Uses structured JSON outputs for tool calling:

```typescript
const options: AgentOptions = {
  toolCallEngine: 'structured_outputs',
  tools: [weatherTool],
};
```

## Agent Lifecycle Hooks

Implement hooks to customize agent behavior:

```typescript
class CustomAgent implements IAgent {
  // Called before each LLM request
  async onLLMRequest(sessionId: string, payload: LLMRequestHookPayload) {
    console.log('Sending request to:', payload.provider);
  }

  // Called after LLM response
  async onLLMResponse(sessionId: string, payload: LLMResponseHookPayload) {
    console.log('Received response from:', payload.provider);
  }

  // Called before tool execution
  async onBeforeToolCall(sessionId: string, toolCall: any, args: any) {
    console.log('Executing tool:', toolCall.name);
    return args; // Can modify arguments
  }

  // Called after tool execution
  async onAfterToolCall(sessionId: string, toolCall: any, result: any) {
    console.log('Tool result:', result);
    return result; // Can modify result
  }

  // Called before loop termination
  async onBeforeLoopTermination(sessionId: string, finalEvent: any) {
    // Decide whether to continue or finish
    return { finished: true };
  }

  // Called at start of each iteration
  async onEachAgentLoopStart(sessionId: string) {
    console.log('Starting new iteration');
  }

  // Called when agent loop ends
  async onAgentLoopEnd(sessionId: string) {
    console.log('Agent execution completed');
  }
}
```

## Context Management

Configure how the agent manages conversation context:

```typescript
const contextOptions: AgentContextAwarenessOptions = {
  maxImagesCount: 5, // Limit images in context to prevent token overflow
};

const agentOptions: AgentOptions = {
  context: contextOptions,
};
```

## Error Handling

Handle tool execution errors:

```typescript
class RobustAgent implements IAgent {
  async onToolCallError(sessionId: string, toolCall: any, error: any) {
    console.error('Tool execution failed:', error);
    
    // Return a recovery value or re-throw
    return {
      error: true,
      message: 'Tool execution failed, please try again',
    };
  }
}
```

## TypeScript Support

The package is fully typed with TypeScript support:

- Complete type safety for all interfaces and options
- Generic support for custom agent implementations
- Module augmentation for extending event types
- Strict typing for tool definitions and parameters

## Best Practices

1. **Event Stream Management**: Use appropriate `maxEvents` limits to prevent memory leaks
2. **Tool Design**: Keep tools focused and well-documented with clear schemas
3. **Context Awareness**: Configure `maxImagesCount` for multimodal conversations
4. **Error Handling**: Implement proper error handling in tool functions and hooks
5. **Streaming**: Use streaming mode for long-running or interactive applications
6. **Custom Events**: Extend event types for domain-specific monitoring needs

## License

Apache-2.0
