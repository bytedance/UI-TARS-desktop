# @tarko/agent

An event-stream driven meta agent framework for building effective multimodal Agents.

## Overview

`@tarko/agent` is the core framework that powers intelligent agents capable of reasoning, tool usage, and multimodal interactions. Built for developers who need reliable, production-ready AI agents with full control over execution flow.

🎯 **精细 Context Engineering**

在 Tarko 中，我们针对 Agent Loop 的多模态内容、Run Loop 的上下文压缩、MCP Result 等都进行了大量的优化，这极大地减少了上层开发者的开发负担。

🔗 **多模型兼容的 Tool Call**

Tarko 以 Tool Call 为基础，并提供了开箱即用的 Model Provider、多 Model Provider 等机制，让你能够轻松地切换模型，同时，带来了多种 Tool Call Engine 的支持，即使模型不支持 Tool Call，你也能够实现自定义 Tool Call 解析来完成支持。

📊 **稳定性与观测**

在 Tarko 中，能够在运行时将 Agent 所依赖的环境保存为 Snapshot，接着，可以基于 Snapshot 来回放 Agent，不仅用于调试，也可以保障 Context、与最终的 Response 的确定性。

🚀 **强大的拓展能力**

在 Tarko 中，拥有丰富的 Agent Hooks，让你能够快速地拓展能力，快速实现垂直场景的 Agent，如 DeepResearch Agent、GUI Agent、Coding Agent 等。

💨 **Protocol 驱动**

Tarko 中的 Context、Memory 与 Web UI 完全基于一套标准的协议驱动，因此，通过 Tarko 开发 Agent 将能够享受开箱即用的 Web UI，也支持基于协议自定义实现。

🌟 **开源项目采纳**

Tarko 已经驱动了 Agent TARS、UI-TARS Desktop 等开源项目的建设，这些项目在 Github 上获取了超过 15k 的 Stars。

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
        api_key: process.env.CUSTOM_API_KEY
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
