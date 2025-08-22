# @tarko/agent

An event-stream driven meta agent framework for building effective multimodal Agents.

## Overview

`@tarko/agent` is the core framework that powers intelligent agents capable of reasoning, tool usage, and multimodal interactions. Built for developers who need reliable, production-ready AI agents with full control over execution flow.

### Key Features

🎯 **Precise Context Engineering**

In Tarko, we have extensively optimized Agent Loop's multimodal content, Run Loop's context compression, MCP Results, and more, significantly reducing the development burden for developers.

🔗 **Multi-Model Compatible Tool Calls**

Tarko is built on Tool Call foundation and provides out-of-the-box Model Provider and multi-Model Provider mechanisms, allowing you to easily switch models. It also supports various Tool Call Engines - even if a model doesn't support Tool Call, you can implement custom Tool Call parsing for support.

📊 **Stability and Observability**

In Tarko, you can save the Agent's runtime environment as Snapshots, then replay Agents based on these Snapshots - not only for debugging but also ensuring deterministic Context and final Responses.

🚀 **Powerful Extensibility**

Tarko provides rich Agent Hooks that enable rapid capability extension and quick implementation of vertical scenario Agents like DeepResearch Agent, GUI Agent, Coding Agent, etc.

💨 **Protocol-Driven**

Tarko's Context, Memory, and Web UI are completely driven by a standard protocol set, so developing Agents through Tarko provides out-of-the-box Web UI and supports custom protocol-based implementations.

🌟 **Open Source Adoption**

Tarko powers the development of open source projects like Agent TARS and UI-TARS Desktop, which have gained over 15k Stars on GitHub.

## Quick Start

### Installation

```bash
npm install @tarko/agent
# or
pnpm add @tarko/agent
```

### Basic Usage

```typescript
import { Agent } from '@tarko/agent';

// Create an agent with custom instructions
const agent = new Agent({
  instructions: 'You are a helpful coding assistant.',
  model: {
    provider: 'openai',
    id: 'gpt-4o'
  },
  maxIterations: 5
});

// Simple text interaction
const response = await agent.run('Help me debug this JavaScript error');
console.log(response.content);

// Streaming response
for await (const event of await agent.run({
  input: 'Explain async/await in JavaScript',
  stream: true
})) {
  if (event.type === 'assistant_message_chunk') {
    process.stdout.write(event.content);
  }
}
```

### With Tools

```typescript
import { Agent, Tool } from '@tarko/agent';

// Define a custom tool
const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' }
    },
    required: ['location']
  },
  execute: async ({ location }) => {
    // Your weather API logic here
    return `Weather in ${location}: 22°C, sunny`;
  }
};

const agent = new Agent({
  instructions: 'You can check weather using the available tools.',
  tools: [weatherTool]
});

const result = await agent.run('What\'s the weather like in Tokyo?');
```

### Multimodal Input

```typescript
const response = await agent.run({
  input: [
    { type: 'text', text: 'What do you see in this image?' },
    { 
      type: 'image_url', 
      image_url: { url: 'data:image/jpeg;base64,...' } 
    }
  ]
});
```

## API Reference

### Agent Constructor

```typescript
interface AgentOptions {
  instructions?: string;           // System prompt
  tools?: Tool[];                 // Available tools
  model?: ModelConfig;            // LLM configuration
  maxIterations?: number;         // Max reasoning loops (default: 10)
  maxTokens?: number;            // Token limit per request
  temperature?: number;          // LLM temperature (default: 0.7)
  logLevel?: LogLevel;           // Logging verbosity
  context?: ContextOptions;      // Multimodal context settings
}
```

### Core Methods

#### `agent.run(input)`

Execute the agent with text input:

```typescript
const response = await agent.run('Your question here');
```

#### `agent.run(options)`

Execute with advanced options:

```typescript
interface AgentRunOptions {
  input: string | ChatCompletionMessageParam[];
  stream?: boolean;              // Enable streaming
  sessionId?: string;           // Session identifier
  model?: string;               // Override model
  provider?: string;            // Override provider
  abortSignal?: AbortSignal;    // Cancellation support
}
```

#### `agent.registerTool(tool)`

Add tools dynamically:

```typescript
agent.registerTool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  parameters: { /* JSON schema */ },
  execute: async (params) => { /* implementation */ }
});
```

#### `agent.getLLMClient()`

Access the underlying LLM client for direct API calls:

```typescript
const client = agent.getLLMClient();
const response = await agent.callLLM({
  messages: [{ role: 'user', content: 'Hello' }]
});
```

#### `agent.getEventStream()`

Access real-time execution events:

```typescript
const stream = agent.getEventStream();
stream.on('assistant_message', (event) => {
  console.log('Agent response:', event.content);
});
```

### Event Types

- `agent_run_start` - Execution begins
- `user_message` - User input received
- `assistant_message` - Agent response
- `tool_call` - Tool execution
- `agent_run_end` - Execution complete

## Publishing Agents

🚧 **Work in Progress** - Documentation coming soon

## Deployment

🚧 **Work in Progress** - Documentation coming soon

## Running Agents

🚧 **Work in Progress** - Documentation coming soon

## Advanced Configuration

### Custom Model Providers

```typescript
const agent = new Agent({
  model: {
    providers: [
      {
        name: 'custom-provider',
        baseURL: 'https://api.custom-llm.com/v1',
        apiKey: process.env.CUSTOM_API_KEY
      }
    ],
    provider: 'custom-provider',
    id: 'custom-model-v1'
  }
});
```

### Context Awareness

```typescript
const agent = new Agent({
  context: {
    maxImagesCount: 10,        // Max images in context
    retainHistory: true,       // Keep conversation history
    summarizeAfter: 50         // Summarize after N messages
  }
});
```

### Tool Call Engines

```typescript
const agent = new Agent({
  toolCallEngine: 'native',    // 'native' | 'prompt-engineering' | 'structured-outputs'
  enableStreamingToolCallEvents: true
});
```

## Tarko Ecosystem

**Tarko** is a comprehensive framework for building AI applications. `@tarko/agent` integrates seamlessly with other Tarko components:

- **[@tarko/model-provider](https://www.npmjs.com/package/@tarko/model-provider)** - Multi-provider LLM abstraction
- **[@tarko/shared-utils](https://www.npmjs.com/package/@tarko/shared-utils)** - Common utilities and logging
- **[@tarko/agent-interface](https://www.npmjs.com/package/@tarko/agent-interface)** - Type definitions and contracts
- **[@tarko/llm-client](https://www.npmjs.com/package/@tarko/llm-client)** - Low-level LLM communication

<!-- [PLACEHOLDER: Add links to other Tarko documentation] -->



## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting PRs.

## License

Apache-2.0 - see [LICENSE](https://github.com/bytedance/UI-TARS-desktop/blob/main/LICENSE) for details.
