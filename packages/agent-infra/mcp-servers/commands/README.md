## Commands MCP Server

[![NPM Downloads](https://img.shields.io/npm/d18m/@agent-infra/mcp-server-commands)](https://www.npmjs.com/package/@agent-infra/mcp-server-commands)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=filesystem&config=eyJjb21tYW5kIjoibnB4IEBhZ2VudC1pbmZyYS9tY3Atc2VydmVyLWNvbW1hbmRzQGxhdGVzdCJ9) [<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522commands%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-commands%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522commands%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-commands%2540latest%2522%255D%257D)


A Model Context Protocol (MCP) server that provides execuate arbitrary commands.

![](https://github.com/user-attachments/assets/ee8df75f-04f4-46c8-8b57-0e32e4373c3e)


### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop or any other MCP client


### Getting started

#### Local (Stdio)

First, install the Commands MCP server with your client. A typical configuration looks like this:

```js
{
  "mcpServers": {
    "commands": {
      "command": "npx",
      "args": [
        "-y",
        "@agent-infra/mcp-server-commands@latest",
        "--cwd",
        "/tmp"
      ]
    }
  }
}
```

<details><summary><b>Install in VS Code</b></summary>

You can also install the Commands MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"commands","command":"npx","args":["@agent-infra/mcp-server-commands@latest"]}'
```

After installation, the Commands MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx @agent-infra/mcp-server-commands`. You can also verify config or add command like arguments via clicking `Edit`.

```js
{
  "mcpServers": {
    "commands": {
      "command": "npx",
      "args": [
        "-y",
        "@agent-infra/mcp-server-commands@latest"
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
    "commands": {
      "command": "npx",
      "args": [
        "-y",
        "@agent-infra/mcp-server-commands@latest"
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
    "commands": {
      "command": "npx",
      "args": [
        "-y",
        "@agent-infra/mcp-server-commands@latest"
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
npx @agent-infra/mcp-server-commands --port 8089
```

You can use one of the two MCP Server remote endpoint:
- Streamable HTTP(Recommended): `http://127.0.0.1::8089/mcp`
- SSE: `http://127.0.0.1::8089/sse`


And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "commands": {
      "url": "http://127.0.0.1::8089/sse"
    }
  }
}
```

`url` to the Streamable HTTP:

```js
{
  "mcpServers": {
    "commands": {
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
import { createServer } from '@agent-infra/mcp-server-commands';
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
  name: 'run_script',
  arguments: {
    interpreter: 'node',
    script: 'console.log(1+1);',
  },
});
console.log(toolResult);
```

### Developement

Access http://127.0.0.1:6274/:

```bash
npm run dev
```
