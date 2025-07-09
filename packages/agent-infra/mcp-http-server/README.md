# MCP HTTP Server

A high performance HTTP+SSE Server with Request Headers for MCP Server.

## Features

- **HTTP/SSE Transport**: Support for both HTTP POST and Server-Sent Events
- **Flexible Routing**: Configurable endpoint paths and prefixes
- **Request Headers**: Access to HTTP headers in MCP server context
- **Multiple Transports**: Both stateful and stateless modes
- **Middleware Support**: Custom middleware for authentication, logging, etc.

## Install

```bash
npm i mcp-http-server -S
```

## Quick Start

```ts
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { createServer } from './server.js';

await startSseAndStreamableHttpMcpServer({
  port: 3000,
  createMcpServer: async (params) => {
    console.log('Request headers:', params.headers);
    return createServer();
  },
});
```

## API Reference

### `startSseAndStreamableHttpMcpServer(params)`

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `port` | `number` | Port to listen on (default: 8080) |
| `host` | `string` | Host to bind to (default: '::') |
| `stateless` | `boolean` | Enable stateless mode for streamable HTTP (default: true) |
| `middlewares` | `MiddlewareFunction[]` | Custom Express middlewares |
| `routes` | `RoutesConfig` | Custom route configuration |
| `logger` | `Logger` | Custom logger instance |
| `createMcpServer` | `function` | Factory function to create MCP server instances |

## Route Configuration

The server supports flexible route configuration through the `routes` parameter.

### Default Routes

By default, the server uses the following routes:

```ts
{
  prefix: '/',      // Route prefix for all endpoints
  mcp: '/mcp',      // MCP endpoint path
  message: '/message', // Message endpoint path for SSE
  sse: '/sse'       // SSE endpoint path
}
```

This creates the following endpoints:
- **POST** `/mcp` - MCP HTTP transport
- **GET** `/mcp` - Returns 405 (Method Not Allowed) or SSE stream
- **GET** `/sse` - SSE connection endpoint
- **POST** `/message` - SSE message endpoint

### Custom Routes

You can customize routes using the `routes` configuration:

```ts
await startSseAndStreamableHttpMcpServer({
  port: 3000,
  routes: {
    prefix: '/api/v1',
    mcp: '/custom-mcp',
    message: '/custom-message',
    sse: '/custom-sse'
  },
  createMcpServer: async () => createServer(),
});
```

This creates endpoints at:
- **POST** `/api/v1/custom-mcp` - MCP HTTP transport
- **GET** `/api/v1/custom-mcp` - Returns 405 or SSE stream
- **GET** `/api/v1/custom-sse` - SSE connection endpoint
- **POST** `/api/v1/custom-message` - SSE message endpoint

### Route Configuration Options

#### `routes.prefix`
- **Type**: `string`
- **Default**: `'/'`
- **Description**: Route prefix for all endpoints

#### `routes.mcp`
- **Type**: `string`
- **Default**: `'/mcp'`
- **Description**: MCP endpoint path (relative to prefix)

#### `routes.message`
- **Type**: `string`
- **Default**: `'/message'`
- **Description**: Message endpoint path for SSE (relative to prefix)

#### `routes.sse`
- **Type**: `string`
- **Default**: `'/sse'`
- **Description**: SSE endpoint path (relative to prefix)

### Path Handling

The server automatically handles leading/trailing slashes in paths:

```ts
// These configurations are equivalent:
routes: {
  prefix: '/api/v2/',
  mcp: 'mcp-endpoint',
  sse: '/sse-endpoint/'
}

routes: {
  prefix: '/api/v2',
  mcp: '/mcp-endpoint',
  sse: 'sse-endpoint'
}
```

Both result in:
- `/api/v2/mcp-endpoint`
- `/api/v2/sse-endpoint/`

## Usage Examples

### Basic HTTP Server

```ts
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = await startSseAndStreamableHttpMcpServer({
  port: 3000,
  createMcpServer: async () => {
    return new Server(
      { name: 'my-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
  },
});

console.log(`Server running at ${server.url}`);
```

### With Custom Routes and Middleware

```ts
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

await startSseAndStreamableHttpMcpServer({
  port: 3000,
  host: 'localhost',
  routes: {
    prefix: '/api/v1',
    mcp: '/mcp',
    sse: '/events'
  },
  middlewares: [authMiddleware],
  createMcpServer: async (context) => {
    console.log('User agent:', context.headers['user-agent']);
    return createServer();
  },
});
```

### Command Line Interface

```ts
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

program
  .name('mcp-server')
  .description('MCP server with HTTP and stdio support')
  .version('1.0.0')
  .option('--host <host>', 'host to bind server to')
  .option('--port <port>', 'port to listen on for HTTP transport')
  .option('--prefix <prefix>', 'route prefix for HTTP endpoints', '/api')
  .action(async (options) => {
    try {
      if (options.port || options.host) {
        // HTTP/SSE transport
        await startSseAndStreamableHttpMcpServer({
          host: options.host,
          port: options.port ? parseInt(options.port) : undefined,
          routes: {
            prefix: options.prefix,
          },
          createMcpServer: async (params) => {
            console.log('HTTP request from:', params.headers['user-agent']);
            return createServer();
          },
        });
      } else {
        // Stdio transport
        const server = createServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.debug('MCP Server running on stdio');
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();
```

## Transport Modes

### Stateful Mode (Default: Stateless)

```ts
await startSseAndStreamableHttpMcpServer({
  stateless: false, // Enable stateful mode
  createMcpServer: async () => createServer(),
});
```

In stateful mode:
- Each client gets a unique session ID
- Sessions are maintained across requests
- Requires proper session cleanup

### Stateless Mode (Recommended)

```ts
await startSseAndStreamableHttpMcpServer({
  stateless: true, // Default
  createMcpServer: async () => createServer(),
});
```

In stateless mode:
- No session state maintained
- Each request is independent
- Better for scaling and reliability

## Return Value

`startSseAndStreamableHttpMcpServer` returns a `McpServerEndpoint` object:

```ts
interface McpServerEndpoint {
  url: string;      // Full URL to MCP endpoint
  sseUrl: string;   // Full URL to SSE endpoint
  port: number;     // Server port
  close: () => void; // Function to close server
}
```

Example:
```ts
const endpoint = await startSseAndStreamableHttpMcpServer({
  port: 3000,
  routes: { prefix: '/api' },
  createMcpServer: async () => createServer(),
});

console.log('MCP endpoint:', endpoint.url);     // http://localhost:3000/api/mcp
console.log('SSE endpoint:', endpoint.sseUrl);  // http://localhost:3000/api/sse

// Gracefully shutdown
process.on('SIGTERM', () => {
  endpoint.close();
});
```

## License

MIT
