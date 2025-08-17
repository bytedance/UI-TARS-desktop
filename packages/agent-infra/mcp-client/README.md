## @agent-infra/mcp-client

[![NPM Downloads](https://img.shields.io/npm/d18m/@agent-infra/mcp-client)](https://www.npmjs.com/package/@agent-infra/mcp-client)

✨ A unified MCP Client implemented in TypeScript, supporting four major transports out of the box: **In-memory**, Stdio, SSE (Server-Sent Events), and **Streamable HTTP**.

### 🚀 Features

- 🟦 **Written in TypeScript**: Type-safe, modern, and easy to integrate.
- 🔌 **Multi-Transport Support**: Out-of-the-box support for four major transports:
  - 🧠 **In-memory**: For fast, local tool integration.
  - 🖥️ **Stdio**: Communicate with tools via standard input/output, perfect for process-based tools.
  - 🔄 **SSE (Server-Sent Events)**: Real-time, event-driven communication over HTTP.
  - 🌐 **Streamable HTTP**: Efficient, stream-based HTTP communication for scalable remote tools.
- 🛠️ **Unified API**: Interact with all transports using a single, consistent interface.
- 🧩 **Highly Extensible**: Easily add custom transports or tools as needed.
- 🔍 **Filtering Support**: Filter tools and prompts using glob patterns with allow/block lists.

### ⚡ Quick Start

```ts
import { MCPClient } from '@agent-infra/mcp-client';

// type: module project usage
import { createServer as createFileSystemServer } from '@agent-infra/mcp-server-filesystem';
// commonjs project usage
// const { createServer as createFileSystemServer } = await import('@agent-infra/mcp-server-filesystem')

const mcpClient = new MCPClient([
  // In-memory
  {
    type: 'builtin',
    name: 'FileSystem',
    description: 'filesystem tool',
    mcpServer: createFileSystemServer({
      allowedDirectories: [omegaDir],
    }),
  },
  // stdio
  {
    type: 'stdio',
    name: 'FileSystem-Stdio',
    description: 'filesystem tool',
    command: 'npx',
    args: [
      '-y',
      '@agent-infra/mcp-server-filesystem'
    ]
  },
  // sse
  {
    type: 'sse',
    name: 'FileSystem-sse',
    description: 'filesystem tool',
    url: 'http://localhost:8889/sse'
  },
  // streamable-http
  {
    type: 'sse',
    name: 'FileSystem-http',
    description: 'filesystem tool',
    url: 'http://localhost:8889/mcp'
  }
]);


await mcpClient.listTools();
await mcpClient.listPrompts();
const result = await mcpClient.callTool({
  client: 'FileSystem-sse',
  name: 'list_directory',
  arguments: {
    path: '~/your_computer'
  },
});
```

### 🔍 Filtering Tools and Prompts

You can filter tools and prompts using glob patterns with allow and block lists:

```ts
const mcpClient = new MCPClient([
  {
    type: 'builtin',
    name: 'FileSystem',
    description: 'filesystem tool',
    mcpServer: createFileSystemServer({
      allowedDirectories: [omegaDir],
    }),
    // Filter configuration
    filters: {
      tools: {
        allow: ['list_*', 'read_*'], // Only allow tools starting with 'list_' or 'read_'
        block: ['delete_*']          // Block any tools starting with 'delete_'
      },
      prompts: {
        allow: ['safe_*'],           // Only allow prompts starting with 'safe_'
        block: ['admin_*']           // Block prompts starting with 'admin_'
      }
    }
  }
]);

// List all tools (filtered)
const tools = await mcpClient.listTools();

// List all prompts (filtered)  
const prompts = await mcpClient.listPrompts();

// List tools from specific server
const serverTools = await mcpClient.listTools('FileSystem');
```

**Filter Rules:**
- **Allow patterns**: If specified, only items matching these patterns are included
- **Block patterns**: Items matching these patterns are excluded
- **Pattern syntax**: Uses [minimatch](https://github.com/isaacs/minimatch) glob patterns (`*`, `**`, `?`, `[...]`, etc.)
- **Processing order**: Allow filter is applied first, then block filter

### 🙏 Credits

Thanks to:

- [kangfenmao](https://github.com/kangfenmao) for creating a great AI chatbot product [Cherry Studio](https://github.com/CherryHQ/cherry-studio) from which we draw a lot of inspiration for browser detection functionality.
- The [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) project which helps us develop and use the agent tools better.
