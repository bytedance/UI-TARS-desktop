# @tarko/mcp-agent

An event-stream driven MCP Agent Framework for building effective multimodal Agents.

## Installation

```bash
npm install @tarko/mcp-agent
```

## Usage

```typescript
import { MCPAgent } from '@tarko/mcp-agent';

const agent = new MCPAgent({
  instructions: 'You are a helpful assistant.',
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: ['@agent-infra/mcp-server-filesystem@latest'],
    },
    browser: {
      command: 'npx', 
      args: ['@agent-infra/mcp-server-browser@latest'],
    },
  },
  model: {
    provider: 'openai',
    model: 'gpt-4',
  },
});

await agent.initialize();
const response = await agent.run('List files in current directory');
await agent.cleanup();
```

## MCP Server Configuration

### Stdio Transport
```typescript
{
  mcpServers: {
    commands: {
      command: 'npx',
      args: ['-y', '@agent-infra/mcp-server-commands@latest'],
      env: { NODE_ENV: 'production' }
    }
  }
}
```

### HTTP/SSE Transport
```typescript
{
  mcpServers: {
    remote: {
      url: 'http://localhost:8089/sse'
    }
  }
}
```

## Server Filtering

```typescript
const agent = new MCPAgent({
  mcpServers: { /* all servers */ },
  mcpServer: {
    include: ['filesystem', 'browser'],
    exclude: ['dangerous-server']
  }
});
```

## Available MCP Servers

- [`@agent-infra/mcp-server-filesystem`](https://www.npmjs.com/package/@agent-infra/mcp-server-filesystem) - File operations
- [`@agent-infra/mcp-server-browser`](https://www.npmjs.com/package/@agent-infra/mcp-server-browser) - Web automation
- [`@agent-infra/mcp-server-commands`](https://www.npmjs.com/package/@agent-infra/mcp-server-commands) - Command execution
- [`@agent-infra/mcp-server-search`](https://www.npmjs.com/package/@agent-infra/mcp-server-search) - Search operations
