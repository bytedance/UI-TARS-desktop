# @tarko/mcp-agent

## Introduction

`@tarko/mcp-agent` is an intelligent agent framework based on the **Model Context Protocol (MCP)** that allows you to easily connect and manage multiple MCP servers, integrating their tools into your AI agents.

## When to use?

`@tarko/mcp-agent` is ideal when you need to build an AI agent that can interact with multiple external services and tools:

- **Multi-service Integration**: Connect to multiple MCP servers like filesystems, databases, API services
- **Unified Tool Management**: Centrally manage and invoke tools from different servers
- **Dynamic Service Discovery**: Discover and register new MCP servers and tools at runtime
- **Enterprise Applications**: Build intelligent assistants that need access to various enterprise systems

## Install

```bash
npm install @tarko/mcp-agent
```

## Core Features

- [x] **Multi-server Support**: Connect and manage multiple MCP servers simultaneously
- [x] **Automatic Tool Discovery**: Automatically discover and register tools provided by MCP servers
- [x] **Flexible Client Versions**: Support both v1 and v2 MCP client implementations
- [x] **Server Filtering**: Support include/exclude patterns to filter specific servers
- [x] **Error Handling**: Comprehensive error handling and logging
- [x] **Resource Management**: Automatic connection lifecycle and resource cleanup management

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

You can use `include` and `exclude` patterns to filter specific MCP servers:

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: { /* ... */ },
    github: { /* ... */ },
    database: { /* ... */ },
  },
  // Only enable filesystem and GitHub servers
  mcpServer: {
    include: ['filesystem', 'github'],
  },
});
```

Or exclude specific servers:

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: { /* ... */ },
    github: { /* ... */ },
    database: { /* ... */ },
  },
  // Exclude database server
  mcpServer: {
    exclude: ['database'],
  },
});
```

### Client Version Selection

By default, v2 client is used. You can also choose v1 client:

```ts
const agent = new MCPAgent({
  mcpServers: { /* ... */ },
  mcpClientVersion: 'v1', // or 'v2'
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

## Advanced Usage

### Dynamic Server Management

```ts
import { MCPAgent } from '@tarko/mcp-agent';

class DynamicMCPAgent extends MCPAgent {
  async addServer(name: string, config: MCPServerConfig) {
    // Dynamically add new MCP server
    // Note: This requires re-initializing the agent
    this.mcpServerConfig[name] = config;
    await this.initialize();
  }
}
```

### Custom Tool Adapter

```ts
import { MCPToolAdapter } from '@tarko/mcp-agent';

class CustomToolAdapter extends MCPToolAdapter {
  createTools() {
    const tools = super.createTools();
    
    // Custom tool processing logic
    return tools.map(tool => ({
      ...tool,
      description: `[Custom] ${tool.description}`,
    }));
  }
}
```

## Troubleshooting

### Common Issues

**Q: Failed to connect to MCP server**

A: Check the following:
- Ensure MCP server package is properly installed
- Verify command path and arguments are correct
- Check if environment variables are set correctly
- Review detailed error information in log output

**Q: Tool invocation failed**

A: Possible causes:
- Incorrect tool parameter format
- Internal MCP server error
- Insufficient permissions (e.g., filesystem access)

**Q: Performance issues**

A: Optimization suggestions:
- Use server filtering to reduce unnecessary connections
- Choose appropriate client version (v2 typically has better performance)
- Configure reasonable timeout values

### Debug Mode

Enable verbose logging for more debugging information:

```ts
const agent = new MCPAgent({
  logger: {
    level: 'debug',
  },
  mcpServers: { /* ... */ },
});
```

## Best Practices

1. **Resource Management**: Always call `cleanup()` method when application ends
2. **Error Handling**: Wrap MCP operations with try-catch blocks
3. **Server Filtering**: Only enable needed servers to improve performance
4. **Environment Variables**: Store sensitive information (like API keys) in environment variables
5. **Version Selection**: Prefer v2 client for better performance and stability

## Related Links

- [Model Context Protocol Official Documentation](https://modelcontextprotocol.io/)
- [MCP Servers List](https://github.com/modelcontextprotocol/servers)
- [@tarko/agent Core Documentation](../agent/core.mdx)
