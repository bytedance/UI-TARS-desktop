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
const result = await mcpClient.callTool({
  client: 'FileSystem-sse',
  name: 'list_directory',
  arguments: {
    path: '~/your_computer'
  },
});
```

### 🙏 Credits

Thanks to:

- [kangfenmao](https://github.com/kangfenmao) for creating a great AI chatbot product [Cherry Studio](https://github.com/CherryHQ/cherry-studio) from which we draw a lot of inspiration for browser detection functionality.
- The [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) project which helps us develop and use the agent tools better.
