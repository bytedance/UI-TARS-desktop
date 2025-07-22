## Browser Use MCP Server

[![NPM Downloads](https://img.shields.io/npm/d18m/@agent-infra/mcp-server-browser)](https://www.npmjs.com/package/@agent-infra/mcp-server-browser) [![smithery badge](https://smithery.ai/badge/@bytedance/mcp-server-browser)](https://smithery.ai/server/@bytedance/mcp-server-browser) [![codecov](https://codecov.io/gh/bytedance/UI-TARS-desktop/main/graph/badge.svg?component=mcp_server_browser)](https://app.codecov.io/gh/bytedance/UI-TARS-desktop/components/mcp_server_browser)

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=browser-use&config=eyJjb21tYW5kIjoibnB4IEBhZ2VudC1pbmZyYS9tY3Atc2VydmVyLWJyb3dzZXJAbGF0ZXN0In0%3D) [<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-browser%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%253Amcp%252Finstall%253F%257B%2522name%2522%253A%2522browser%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540agent-infra%252Fmcp-server-browser%2540latest%2522%255D%257D)


A fast, lightweight Model Context Protocol (MCP) server that empowers LLMs with browser automation via Puppeteer’s structured accessibility data, featuring optional vision mode for complex visual understanding and flexible, cross-platform configuration.

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
        "@agent-infra/mcp-server-browser@latest"
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
  --output-dir <path>        path to the directory for output files
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

We have unified the deployment of VNC and MCP under a single URL endpoint, The Dockerfile and DockerHub image will be published together! [video](https://github.com/user-attachments/assets/e04e60aa-c9f9-4732-ac33-66e41d68056b)

<!--- API generated by update-readme.js -->

### API

#### Tools

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `browser_click` | Click an element on the page, before using the tool, use `browser_get_clickable_elements` to get the index of the element, but not call `browser_get_clickable_elements` multiple times | **index** (number, optional): Index of the element to click |
| `browser_close` | Close the browser when the task is done and the browser is not needed anymore |  |
| `browser_close_tab` | Close the current tab |  |
| `browser_evaluate` | Execute JavaScript in the browser console | **script** (string, required): JavaScript code to execute, () => { /* code */ } |
| `browser_form_input_fill` | Fill out an input field, before using the tool, Either 'index' or 'selector' must be provided | **selector** (string, optional): CSS selector for input field, priority use index, if index is not provided, use selector<br/>**index** (number, optional): Index of the element to fill<br/>**value** (string, required): Value to fill<br/>**clear** (boolean, optional): Whether to clear existing text before filling |
| `browser_get_clickable_elements` | Get the clickable or hoverable or selectable elements on the current page, don't call this tool multiple times |  |
| `browser_get_download_list` | Get the list of downloaded files |  |
| `browser_get_markdown` | Get the markdown content of the current page |  |
| `browser_get_text` | Get the text content of the current page |  |
| `browser_go_back` | Go back to the previous page |  |
| `browser_go_forward` | Go forward to the next page |  |
| `browser_hover` | Hover an element on the page, Either 'index' or 'selector' must be provided | **index** (number, optional): Index of the element to hover<br/>**selector** (string, optional): CSS selector for element to hover |
| `browser_navigate` | Navigate to a URL | **url** (string, required):  |
| `browser_new_tab` | Open a new tab | **url** (string, required): URL to open in the new tab |
| `browser_press_key` | Press a key on the keyboard | **key** (string, required): Name of the key to press or a character to generate, such as Enter, Tab, Escape, Backspace, Delete, Insert, F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, PageUp, PageDown, Home, End, ShiftLeft, ShiftRight, ControlLeft, ControlRight, AltLeft, AltRight, MetaLeft, MetaRight, CapsLock, PrintScreen, ScrollLock, Pause, ContextMenu |
| `browser_read_links` | Get all links on the current page |  |
| `browser_screenshot` | Take a screenshot of the current page or a specific element | **name** (string, optional): Name for the screenshot<br/>**selector** (string, optional): CSS selector for element to screenshot<br/>**index** (number, optional): index of the element to screenshot<br/>**width** (number, optional): Width in pixels (default: viewport width)<br/>**height** (number, optional): Height in pixels (default: viewport height)<br/>**fullPage** (boolean, optional): Full page screenshot (default: false)<br/>**highlight** (boolean, optional): Highlight the element |
| `browser_scroll` | Scroll the page | **amount** (number, optional): Pixels to scroll (positive for down, negative for up), if the amount is not provided, scroll to the bottom of the page |
| `browser_select` | Select an element on the page with index, Either 'index' or 'selector' must be provided | **index** (number, optional): Index of the element to select<br/>**selector** (string, optional): CSS selector for element to select<br/>**value** (string, required): Value to select |
| `browser_switch_tab` | Switch to a specific tab | **index** (number, required): Tab index to switch to |
| `browser_tab_list` | Get the list of tabs |  |
| `browser_vision_screen_capture` | Take a screenshot of the current page for vision mode |  |
| `browser_vision_screen_click` | Click left mouse button on the page with vision and snapshot, before calling this tool, you should call `browser_vision_screen_capture` first only once, fallback to `browser_click` if failed | **factors** (array, optional): Vision model coordinate system scaling factors [width_factor, height_factor] for coordinate space normalization. Transformation formula: x = (x_model * screen_width * width_factor) / width_factor y = (y_model * screen_height * height_factor) / height_factor where x_model, y_model are normalized model output coordinates (0-1), screen_width/height are screen dimensions, width_factor/height_factor are quantization factors, If the factors are unknown, leave it blank. Most models do not require this parameter.<br/>**x** (number, required): X pixel coordinate<br/>**y** (number, required): Y pixel coordinate |

#### Resources

| Resource Name | URI Pattern | Description | MIME Type |
|---------------|-------------|-------------|-----------|
| Browser console logs | `console://logs` |  | text/plain |
| Browser Downloads | `download://{name}` |  | Automatic identification based on file extension |
| Browser Screenshots | `screenshot://{name}` |  | Automatic identification based on file extension |

<!--- End of API generated section -->

### Developement

Access http://127.0.0.1:6274/:

```bash
npm run dev
```

### Extended CLI Entry

```js
#!/usr/bin/env node

const {
  BaseLogger,
  setConfig,
  addMiddleware,
} = require('@agent-infra/mcp-server-browser/request-context');

class CustomLogger extends BaseLogger {
  info(...args) {
    console.log('custom');
    console.log(...args);
  }
}

addMiddleware((req, res, next) => {
  console.log('req', req.headers);
  next();
});

setConfig({
  logger: new CustomLogger(),
});

// start server
require('@agent-infra/mcp-server-browser/index');
```
