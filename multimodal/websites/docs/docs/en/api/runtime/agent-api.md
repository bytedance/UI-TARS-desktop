# Agent API

The **Agent** class is the core component of the MCP Agent framework, providing an event-driven architecture for building multimodal AI agents with tool execution capabilities.

## Constructor

### `new Agent(options?)`

Creates a new Agent instance with the specified configuration.

```typescript
import { Agent } from '@tarko/agent';

const agent = new Agent({
  instructions: 'You are a helpful assistant',
  tools: [myTool],
  model: {
    provider: 'openai',
    id: 'gpt-4'
  },
  maxIterations: 10
});
```

**Parameters:**
- `options` (`AgentOptions`): Configuration options for the agent

## Methods

### `abort()`

Aborts the currently running agent task.

```typescript
const isAborted = agent.abort();
if (isAborted) {
  console.log('Agent execution aborted');
}
```

**Returns:** `boolean` - True if execution was aborted, false otherwise

### `callLLM(params, options?)`

Convenient method to call the current selected LLM directly.

```typescript
// Non-streaming call
const response = await agent.callLLM({
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7
});

// Streaming call
const stream = await agent.callLLM({
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true
});

for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

**Overloads:**
- `callLLM(params: Omit<ChatCompletionCreateParams, 'model'> & { stream?: false }, options?: RequestOptions): Promise<ChatCompletion>`
- `callLLM(params: Omit<ChatCompletionCreateParams, 'model'> & { stream: true }, options?: RequestOptions): Promise<AsyncIterable<ChatCompletionChunk>>`

**Parameters:**
- `params` (`Omit<ChatCompletionCreateParams, 'model'>`): Chat completion parameters
- `options` (`RequestOptions`): Optional request options

**Returns:** `Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>`

### `dispose()`

Disposes the agent and releases all resources.

```typescript
// Clean up when done
await agent.dispose();
console.log('Agent disposed successfully');
```

**Returns:** `Promise<void>`

### `generateSummary(request)`

Generates a summary of conversation messages.

```typescript
const summary = await agent.generateSummary({
  messages: [
    { role: 'user', content: 'What is machine learning?' },
    { role: 'assistant', content: 'Machine learning is...' }
  ]
});

console.log(`Summary: ${summary.summary}`);
```

**Parameters:**
- `request` (`SummaryRequest`): Summary request with messages and options

**Returns:** `Promise<SummaryResponse>` - Generated summary

### `getAvailableTools()`

Returns all available tools after applying filters and hooks.

```typescript
const availableTools = await agent.getAvailableTools();
console.log(`${availableTools.length} tools available for execution`);
```

**Returns:** `Promise<Tool[]>` - Array of available tools

### `getCurrentLoopIteration()`

Gets the current iteration number of the agent's reasoning process.

```typescript
const iteration = agent.getCurrentLoopIteration();
console.log(`Currently on iteration ${iteration}`);
```

**Returns:** `number` - Current loop iteration (1-based, 0 if not running)

### `getCurrentResolvedModel()`

Gets the current resolved model configuration.

```typescript
const model = agent.getCurrentResolvedModel();
if (model) {
  console.log(`Using ${model.provider}/${model.id}`);
}
```

**Returns:** `ResolvedModel | undefined` - Current resolved model

### `getEventStream()`

Returns the event stream manager for monitoring agent execution.

```typescript
const eventStream = agent.getEventStream();
eventStream.on('assistant_message', (event) => {
  console.log('Assistant:', event.content);
});
```

**Returns:** `AgentEventStreamProcessor` - Event stream instance

### `getLLMClient()`

Gets the configured LLM client for making direct requests.

```typescript
const llmClient = agent.getLLMClient();
if (llmClient) {
  const response = await llmClient.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello' }]
  });
}
```

**Returns:** `OpenAI | undefined` - The LLM client instance

### `getTools()`

Returns all registered tools, filtered by tool filter options.

```typescript
const tools = agent.getTools();
console.log(`Agent has ${tools.length} tools available`);
```

**Returns:** `Tool[]` - Array of available tool definitions

### `registerTool(tool)`

Registers a tool that the agent can use during execution.

```typescript
import { Tool } from '@tarko/agent';

const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  },
  function: async (args) => {
    const { location } = args as { location: string };
    return `Weather in ${location}: Sunny, 25°C`;
  }
};

agent.registerTool(weatherTool);
```

**Parameters:**
- `tool` (`Tool`): Tool definition to register

### `run(input)` / `run(options)`

Executes the agent's reasoning loop with the provided input.

```typescript
// Simple text input
const response = await agent.run('What is the weather like?');

// With options (non-streaming)
const response = await agent.run({
  input: 'Analyze this image',
  model: 'gpt-4-vision-preview'
});

// Streaming mode
const stream = await agent.run({
  input: 'Help me plan a trip',
  stream: true
});

for await (const event of stream) {
  console.log(event);
}
```

**Overloads:**
- `run(input: string): Promise<AssistantMessageEvent>`
- `run(options: AgentRunNonStreamingOptions): Promise<AssistantMessageEvent>`
- `run(options: AgentRunStreamingOptions): Promise<AsyncIterable<Event>>`

**Parameters:**
- `input` (`string`): Simple text input
- `options` (`AgentRunOptions`): Configuration for this execution

### `setCustomLLMClient(client)`

Sets a custom LLM client for testing or custom implementations.

```typescript
import OpenAI from 'openai';

const customClient = new OpenAI({
  apiKey: 'your-api-key',
  baseURL: 'https://custom-llm-endpoint.com'
});

agent.setCustomLLMClient(customClient);
```

**Parameters:**
- `client` (`OpenAI`): OpenAI-compatible LLM client

### `status()`

Returns the current execution status of the agent.

```typescript
const currentStatus = agent.status();
console.log(`Agent status: ${currentStatus}`);
```

**Returns:** `AgentStatus` - Current execution status

## Configuration Options

### `AgentOptions`

Configuration options for agent initialization:

```typescript
interface AgentOptions {
  // Core configuration
  instructions?: string;           // System prompt/instructions
  name?: string;                   // Agent name for identification
  id?: string;                     // Unique agent ID
  
  // Model configuration
  model?: ModelConfiguration;      // LLM model settings
  temperature?: number;            // Sampling temperature (0-1)
  top_p?: number;                 // Nucleus sampling parameter
  
  // Execution limits
  maxIterations?: number;         // Maximum reasoning iterations
  maxTokens?: number;             // Maximum tokens per request
  
  // Tools and capabilities
  tools?: Tool[];                 // Available tools
  toolCallEngine?: ToolCallEngineType; // Tool execution engine
  
  // Context management
  context?: AgentContextAwarenessOptions; // Multimodal context settings
  
  // Reasoning and planning
  thinking?: LLMReasoningOptions; // Reasoning configuration
  
  // Logging and monitoring
  logLevel?: LogLevel;            // Logging verbosity
  metric?: { enable: boolean };   // Enable metrics collection
  
  // Event handling
  eventStreamOptions?: EventStreamOptions; // Event stream configuration
  enableStreamingToolCallEvents?: boolean; // Stream tool call events
  
  // Tool filtering
  tool?: ToolFilterOptions;       // Tool filtering configuration
}
```

### `AgentRunOptions`

Options for agent execution:

```typescript
interface AgentRunObjectOptions {
  input: string | ChatCompletionContentPart[]; // User input
  stream?: boolean;                            // Enable streaming
  sessionId?: string;                          // Session identifier
  model?: string;                              // Override model
  provider?: string;                           // Override provider
  toolCallEngine?: ToolCallEngineType;         // Override tool engine
  environmentInput?: EnvironmentInput;         // Environment context
  abortSignal?: AbortSignal;                  // Cancellation signal
}
```

## Events and Monitoring

The agent emits various events during execution:

- `user_message` - User input received
- `assistant_message` - Agent response generated
- `tool_call` - Tool execution started
- `tool_result` - Tool execution completed
- `system` - System events and errors
- `agent_run_start` - Agent execution started
- `agent_run_end` - Agent execution completed

```typescript
const eventStream = agent.getEventStream();

eventStream.on('tool_call', (event) => {
  console.log(`Calling tool: ${event.name}`);
});

eventStream.on('assistant_message', (event) => {
  console.log(`Assistant: ${event.content}`);
});
```

## Error Handling

The agent provides robust error handling:

```typescript
try {
  const response = await agent.run('Process this request');
  console.log(response.content);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled');
  } else {
    console.error('Agent error:', error.message);
  }
}
```

Common error scenarios:
- **AbortError**: Request was cancelled via `abort()` or `AbortSignal`
- **ModelError**: LLM provider or model configuration issues
- **ToolError**: Tool execution failures
- **ValidationError**: Invalid input or configuration

## Best Practices

1. **Resource Management**: Always call `dispose()` when done with an agent
2. **Error Handling**: Wrap agent calls in try-catch blocks
3. **Tool Design**: Keep tools focused and well-documented
4. **Context Limits**: Use `maxImagesCount` to manage multimodal context
5. **Streaming**: Use streaming for long-running tasks and real-time feedback
6. **Monitoring**: Subscribe to events for debugging and analytics

## Example: Complete Agent Setup

```typescript
import { Agent, Tool } from '@tarko/agent';

// Define tools
const calculatorTool: Tool = {
  name: 'calculate',
  description: 'Perform mathematical calculations',
  schema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Math expression to evaluate' }
    },
    required: ['expression']
  },
  function: async (args) => {
    const { expression } = args as { expression: string };
    try {
      const result = eval(expression); // Note: Use a safe math evaluator in production
      return `Result: ${result}`;
    } catch (error) {
      return `Error: Invalid expression`;
    }
  }
};

// Create agent
const agent = new Agent({
  instructions: 'You are a helpful math assistant. Use the calculator tool for computations.',
  tools: [calculatorTool],
  model: {
    provider: 'openai',
    id: 'gpt-4'
  },
  maxIterations: 5,
  temperature: 0.1,
  logLevel: 1 // Info level
});

// Set up event monitoring
const eventStream = agent.getEventStream();
eventStream.on('tool_call', (event) => {
  console.log(`🔧 Calling ${event.name}:`, event.args);
});

eventStream.on('assistant_message', (event) => {
  console.log(`🤖 Assistant: ${event.content}`);
});

// Execute agent
async function main() {
  try {
    const response = await agent.run('What is 15 * 23 + 7?');
    console.log('Final answer:', response.content);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await agent.dispose();
  }
}

main();
```
