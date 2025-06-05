## Browser Use MCP Server

[![NPM Downloads](https://img.shields.io/npm/d18m/@agent-infra/mcp-server-browser)](https://www.npmjs.com/package/@agent-infra/mcp-server-browser) [![smithery badge](https://smithery.ai/badge/@bytedance/mcp-server-browser)](https://smithery.ai/server/@bytedance/mcp-server-browser) [![codecov](https://codecov.io/gh/bytedance/UI-TARS-desktop/graph/badge.svg?component=mcp_server_browser)](https://app.codecov.io/gh/bytedance/UI-TARS-desktop/components/mcp_server_browser)

A Model Context Protocol (MCP) server that provides browser automation capabilities using [Puppeteer](https://pptr.dev). This server enables LLMs to interact with web pages through structured accessibility snapshots, bypassing the need for screenshots or visually-tuned models.

![](https://github.com/user-attachments/assets/4c401c0f-01bb-447f-89a3-7e4fdde7d58d)

### Key Features

- **⚡ Fast & lightweight**. Utilizes Puppeteer's label index, not pixel-based input and accessibility DOM tree.
- **👁️ Vision Mode Support**. Optional visual understanding capabilities for complex layouts and visual elements when structured data isn't sufficient.
- **🤖 LLM-optimized**. No vision models needed, operates purely on structured data, less context reducing context token usage.
- **🧩 Flexible Runtime Configuration**. Customize viewport size, coordinate system factors, and User-Agent at runtime via HTTP headers.
- **🌐 Cross-Platform & Extensible**. Support for remote and local browsers, the use of a custom browser engine.


### Requirements

- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop or any other MCP client


### Getting started

#### Local (Stdio)

First, install the Browser MCP server with your client. A typical configuration looks like this:

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-browser@latest"
      ]
    }
  }
}
```

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-browser%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-browser%2540latest%2522%255D%257D)


<details><summary><b>Install in VS Code</b></summary>

You can also install the Browser MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"browser","command":"npx","args":["@agent-infra/mcp-server-browser@latest"]}'
```

After installation, the Browser MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx @agent-infra/mcp-server-browser`. You can also verify config or add command like arguments via clicking `Edit`.

```js
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-browserp@latest"
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
    "browser": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-browser@latest"
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
    "browser": {
      "command": "npx",
      "args": [
        "@agent-infra/mcp-server-browser@latest"
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
npx @agent-infra/mcp-server-browser --port 8089

# run with DISPLAY environment for VNC or other virtual display
DISPLAY=:0 npx @agent-infra/mcp-server-browser --port 8089
```

You can use one of the two MCP Server remote endpoint:
- Streamable HTTP(Recommended): `http://127.0.0.1::8089/mcp`
- SSE: `http://127.0.0.1::8089/sse`


And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "browser": {
      "url": "http://127.0.0.1::8089/sse"
    }
  }
}
```

`url` to the Streamable HTTP:

```js
{
  "mcpServers": {
    "browser": {
      "type": "streamable-http", // If there is MCP Client support
      "url": "http://127.0.0.1::8089/mcp"
    }
  }
}
```

#### In-memory call

If your MCP Client is developed based on JavaScript / TypeScript, you can directly use in-process calls to avoid requiring your users to install the command-line interface to use Browser MCP.

```js
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// type: module project usage
import { createServer } from '@agent-infra/mcp-server-browser';
// commonjs project usage
// const { createServer } = await import('@agent-infra/mcp-server-browser')

const client = new Client(
  {
    name: 'test browser client',
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
  name: 'browser_navigate',
  arguments: {
    url: 'https://www.google.com',
  },
});
console.log(toolResult);
```

### Configuration

Browser MCP server supports following arguments. They can be provided in the JSON configuration above, as a part of the `"args"` list:

```
> npx @agent-infra/mcp-server-browser@latest -h
  -V, --version              output the version number
  --browser <browser>        browser or chrome channel to use, possible values: chrome, edge, firefox.
  --cdp-endpoint <endpoint>  CDP endpoint to connect to, for example "http://127.0.0.1:9222/json/version"
  --ws-endpoint <endpoint>   WebSocket endpoint to connect to, for example "ws://127.0.0.1:9222/devtools/browser/{id}"
  --executable-path <path>   path to the browser executable.
  --headless                 run browser in headless mode, headed by default
  --host <host>              host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.
  --port <port>              port to listen on for SSE and HTTP transport.
  --proxy-bypass <bypass>    comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com"
  --proxy-server <proxy>     specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080"
  --user-agent <ua string>   specify user agent string
  --user-data-dir <path>     path to the user data directory.
  --viewport-size <size>     specify browser viewport size in pixels, for example "1280, 720"
  --vision                   Run server that uses screenshots (Aria snapshots are used by default)
  -h, --help                 display help for command
```

#### Runtime Configuration

The browser runtime requires configuration for `Viewport Size`, `Vision Model Coordinate Factors`, and `User Agent`. These can be passed through corresponding HTTP headers:

| Header | Description |
|--------|-------------|
| `x-viewport-size` | Browser viewport size, format: `width,height` separated by comma |
| `x-vision-factors` | Vision model coordinate system factors, format: `x_factor,y_factor` separated by comma |
| `x-user-agent` | User Agent string, defaults to system User Agent if not specified |
> **Note:** Header names are case-insensitive.

Example:

```http
x-viewport-size: 1920,1080
x-vision-factors: 1.0,1.0
x-user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```


### Docker

We have unified the deployment of VNC and MCP under a single URL endpoint, The Dockerfile and DockerHub image will be published together!

<video src="https://github.com/user-attachments/assets/e04e60aa-c9f9-4732-ac33-66e41d68056b" alt="VNC with Browser MCP Server" />

### Developement

Access http://127.0.0.1:6274/:

```bash
npm run dev
```
