# @tarko/agent

A powerful, event-stream driven meta agent framework for building effective multimodal AI Agents in the **Tarko** ecosystem.

## Overview

`@tarko/agent` is the core framework that powers intelligent agents capable of reasoning, tool usage, and multimodal interactions. Built for developers who need reliable, production-ready AI agents with full control over execution flow.

### Key Features

- **Multi-turn reasoning** - Intelligent agent loop with customizable iterations
- **Tool ecosystem** - Register and execute custom tools seamlessly  
- **Multimodal support** - Handle text, images, and complex inputs
- **Provider agnostic** - Works with OpenAI, Anthropic, and custom LLM providers
- **Event streaming** - Real-time tracking of agent execution state
- **TypeScript first** - Full type safety and excellent DX

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

<!-- [PLACEHOLDER: Add publishing workflow documentation] -->

### Package Structure

When publishing your agent as an npm package:

```
my-agent/
├── src/
│   ├── index.ts          # Main agent export
│   ├── tools/            # Custom tools
│   └── prompts/          # Prompt templates
├── package.json
└── README.md
```

### Example Package

```typescript
// src/index.ts
import { Agent, AgentOptions } from '@tarko/agent';
import { myCustomTool } from './tools';

export class MySpecializedAgent extends Agent {
  constructor(options: AgentOptions = {}) {
    super({
      ...options,
      instructions: 'I am a specialized agent for...',
      tools: [myCustomTool, ...(options.tools || [])]
    });
  }
}

export default MySpecializedAgent;
```

## Deployment

<!-- [PLACEHOLDER: Add deployment guide with Docker, serverless examples] -->

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

```bash
# Required for OpenAI
OPENAI_API_KEY=your_api_key

# For Anthropic
ANTHROPIC_API_KEY=your_api_key

# Optional
LOG_LEVEL=info
MAX_ITERATIONS=10
```

## Running Agents

### Development Mode

```bash
# Install dependencies
npm install

# Run with hot reload
npm run dev

# Run tests
npm test
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Integration Examples

#### Express.js Server

```typescript
import express from 'express';
import { Agent } from '@tarko/agent';

const app = express();
const agent = new Agent({ /* config */ });

app.post('/chat', async (req, res) => {
  try {
    const response = await agent.run(req.body.message);
    res.json({ response: response.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### WebSocket Streaming

```typescript
import WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    const { message } = JSON.parse(data.toString());
    
    for await (const event of await agent.run({ 
      input: message, 
      stream: true 
    })) {
      ws.send(JSON.stringify(event));
    }
  });
});
```

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

- **`@tarko/model-provider`** - Multi-provider LLM abstraction
- **`@tarko/shared-utils`** - Common utilities and logging
- **`@tarko/agent-interface`** - Type definitions and contracts
- **`@tarko/llm-client`** - Low-level LLM communication

<!-- [PLACEHOLDER: Add links to other Tarko documentation] -->

### Related Documentation

- [Tarko Model Provider Guide](../model-provider/README.md)
- [Tool Development Guide](./docs/tools.md)
- [Event System Reference](./docs/events.md)
- [Deployment Best Practices](./docs/deployment.md)

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting PRs.

## License

Apache-2.0 - see [LICENSE](../../LICENSE) for details.
