## {{name}} MCP Server

[![NPM Downloads](https://img.shields.io/npm/d18m/mcp-server-{{name}})](https://www.npmjs.com/package/mcp-server-{{name}})

A Model Context Protocol (MCP) server for {{name}}


### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop or any other MCP client


### Getting started

#### Local (Stdio)

First, install the Commands MCP server with your client. A typical configuration looks like this:

```js
{
  "mcpServers": {
    "{{name}}": {
      "command": "npx",
      "args": [
        "mcp-server-{{name}}@latest"
      ]
    }
  }
}
```

<details><summary><b>Install in VS Code</b></summary>

You can also install the {{name}} MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"{{name}}","command":"npx","args":["mcp-server-{{name}}@latest"]}'
```

After installation, the Commands MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, `npx mcp-server-{{name}}`. You can also verify config or add command like arguments via clicking `Edit`.

```js
{
  "mcpServers": {
    "{{name}}": {
      "command": "npx",
      "args": [
        "mcp-server-{{name}}@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Follow Windsuff MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use following configuration:

```js
{
  "mcpServers": {
    "{{name}}": {
      "command": "npx",
      "args": [
        "mcp-server-{{name}}@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Desktop</b></summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user), use following configuration:

```js
{
  "mcpServers": {
    "{{name}}": {
      "command": "npx",
      "args": [
        "mcp-server-{{name}}@latest"
      ]
    }
  }
}
```
</details>

#### Remote (SSE / Streamable HTTP)

At the same time, use `--port $your_port` arg to start the browser mcp can be converted into SSE and Streamable HTTP Server.

```bash
# normal run remote mcp server
npx mcp-server-{{name}} --port 8089
```

You can use one of the two MCP Server remote endpoint:
- Streamable HTTP(Recommended): `http://127.0.0.1::8089/mcp`
- SSE: `http://127.0.0.1::8089/sse`


And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "{{name}}": {
      "url": "http://127.0.0.1::8089/sse"
    }
  }
}
```

`url` to the Streamable HTTP:

```js
{
  "mcpServers": {
    "{{name}}": {
      "type": "streamable-http", // If there is MCP Client support
      "url": "http://127.0.0.1::8089/mcp"
    }
  }
}
```

#### In-memory call

If your MCP Client is developed based on JavaScript / TypeScript, you can directly use in-process calls to avoid requiring your users to install the command-line interface to use Commands MCP.

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// type: module project usage
import { createServer } from 'mcp-server-{{name}}';
// commonjs project usage
// const { createServer } = await import('@agent-infra/mcp-server-commands')

const client = new Client(
  {
    name: 'test commands client',
    version: '1.0',
  },
  {
    capabilities: {},
  },
);

const server = createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

await Promise.all([
  client.connect(clientTransport),
  server.connect(serverTransport),
]);

// list tools
const result = await client.listTools();
console.log(result);

// call tool
const toolResult = await client.callTool({
  name: 'test_tool',
  arguments: {
    hello: 'hello'
  },
});
console.log(toolResult);
```

### Developement

Access http://127.0.0.1:6274/:

```bash
npm run dev
```
