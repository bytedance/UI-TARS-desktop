# @tarko/mcp-agent

## Introduction

`@tarko/mcp-agent` is an agent framework based on Model Context Protocol (MCP) for connecting MCP servers and integrating their tools.

## When to use?

Use when connecting MCP servers.

## Install

```bash
npm install @tarko/mcp-agent
```

## Core Features

- Multi-server connections
- Automatic tool discovery and registration
- v1/v2 client support
- Server filtering (include/exclude)
- Connection lifecycle management

## Quick Start

### Basic Usage

Create `index.ts`:

```ts
import { MCPAgent } from '@tarko/mcp-agent';

const agent = new MCPAgent({
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
    },
    github: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: 'your-token-here',
      },
    },
  },
});

async function main() {
  // Initialize agent and connect to all MCP servers
  await agent.initialize();

  // Run the agent
  const response = await agent.run({
    input: 'Help me check files in the current directory, then create a new README.md',
  });

  console.log(response);

  // Cleanup resources
  await agent.cleanup();
}

main();
```

### Server Filtering

```ts
// Only enable specified servers
const agent = new MCPAgent({
  mcpServers: { filesystem: {/*...*/}, github: {/*...*/} },
  mcpServer: { include: ['filesystem'] },
});

// Exclude specified servers
const agent = new MCPAgent({
  mcpServers: { filesystem: {/*...*/}, github: {/*...*/} },
  mcpServer: { exclude: ['github'] },
});
```

### Client Version

```ts
const agent = new MCPAgent({
  mcpServers: { /*...*/ },
  mcpClientVersion: 'v1', // default 'v2'
});
```

## API Reference

### MCPAgent

#### Constructor

```ts
const agent = new MCPAgent(options: MCPAgentOptions);
```

#### MCPAgentOptions

```ts
interface MCPAgentOptions extends AgentOptions {
  /** MCP server configurations */
  mcpServers?: MCPServerRegistry;
  
  /** MCP server filtering options */
  mcpServer?: {
    include?: string[];
    exclude?: string[];
  };
  
  /** MCP client version */
  mcpClientVersion?: 'v1' | 'v2';
}
```

#### MCPServerConfig

```ts
interface MCPServerConfig {
  /** Launch command */
  command?: string;
  
  /** Command arguments */
  args?: string[];
  
  /** Environment variables */
  env?: Record<string, string>;
  
  /** SSE connection URL (optional, mutually exclusive with command) */
  url?: string;
}
```

#### Methods

##### initialize()

Initialize the agent and connect to all MCP servers:

```ts
await agent.initialize();
```

##### cleanup()

Cleanup all resources and connections:

```ts
await agent.cleanup();
```

## Configuration Examples

### Filesystem Server

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: [
        '@modelcontextprotocol/server-filesystem',
        '/Users/username/projects',
        '/Users/username/documents',
      ],
    },
  },
});
```

### GitHub Server

```ts
const agent = new MCPAgent({
  mcpServers: {
    github: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
      },
    },
  },
});
```

### PostgreSQL Server

```ts
const agent = new MCPAgent({
  mcpServers: {
    postgres: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db',
      },
    },
  },
});
```

### SSE Connection

```ts
const agent = new MCPAgent({
  mcpServers: {
    remote_service: {
      url: 'https://api.example.com/mcp',
    },
  },
});
```



## Related Links

- [Model Context Protocol Official Documentation](https://modelcontextprotocol.io/)
- [MCP Servers List](https://github.com/modelcontextprotocol/servers)
- [@tarko/agent Core Documentation](../agent/core.mdx)
