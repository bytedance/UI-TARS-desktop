## FileSystem MCP Server

[![NPM Downloads](https://img.shields.io/npm/d18m/@agent-infra/mcp-server-filesystem)](https://www.npmjs.com/package/@agent-infra/mcp-server-filesystem)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=filesystem&config=eyJjb21tYW5kIjoibnB4IEBhZ2VudC1pbmZyYS9tY3Atc2VydmVyLWZpbGVzeXN0ZW1AbGF0ZXN0In0%3D) [<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522filesystem%2522%252C%2522filesystem%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-filesystem%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522filesystem%2522%252C%2522filesystem%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-filesystem%2540latest%2522%255D%257D)


A Model Context Protocol (MCP) server that provides filesystem operations.

![](https://github.com/user-attachments/assets/60f9363b-f60f-454b-9673-f28378d00a2a)


### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop or any other MCP client


### Getting started

#### Local (Stdio)

First, install the Filesystem MCP server with your client. A typical configuration looks like this:

```js
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-filesystem@latest"
      ]
    }
  }
}
```


<details><summary><b>Install in VS Code</b></summary>

You can also install the Filesystem MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"filesystem","command":"npx","args":["@agent-infra/mcp-server-filesystem@latest"]}'
```

After installation, the Filesystem MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx @agent-infra/mcp-server-filesystem`. You can also verify config or add command like arguments via clicking `Edit`.

```js
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-filesystem@latest",
        "--allowed-directories /tmp"
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
    "filesystem": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-filesystem@latest",
        "--allowed-directories /tmp"
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
    "filesystem": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-filesystem@latest",
        "--allowed-directories /tmp"
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
npx @agent-infra/mcp-server-filesystem --port 8089 --allowed-directories <dir>
```

You can use one of the two MCP Server remote endpoint:
- Streamable HTTP(Recommended): `http://127.0.0.1::8089/mcp`
- SSE: `http://127.0.0.1::8089/sse`


And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "filesystem": {
      "url": "http://127.0.0.1::8089/sse"
    }
  }
}
```

`url` to the Streamable HTTP:

```js
{
  "mcpServers": {
    "filesystem": {
      "type": "streamable-http", // If there is MCP Client support
      "url": "http://127.0.0.1::8089/mcp"
    }
  }
}
```

#### In-memory call

If your MCP Client is developed based on JavaScript / TypeScript, you can directly use in-process calls to avoid requiring your users to install the command-line interface to use Filesystem MCP.

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// type: module project usage
import { createServer } from '@agent-infra/mcp-server-filesystem';
// commonjs project usage
// const { createServer } = await import('@agent-infra/mcp-server-filesystem')

const client = new Client(
  {
    name: 'test filesystem client',
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
  name: 'list_directory',
  arguments: {
    path: '~/your_computer'
  },
});
console.log(toolResult);
```

### Developement

Access http://127.0.0.1:6274/:

```bash
npm run dev
```
