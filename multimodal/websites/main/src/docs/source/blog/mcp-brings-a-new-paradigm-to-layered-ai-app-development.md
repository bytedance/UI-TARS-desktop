# MCP Brings a New Paradigm to Layered AI Application Development

> [!TIP] > **Preface**: While MCP is a hot topic, its most critical aspect **decoupling tool providers from application developers through standardized protocols** has been overlooked. This shift mirrors the frontend-backend separation in web development, representing a **paradigm shift in AI Agent application development**.
>
> Using the development of the [Agent TARS](https://agent-tars.com/) application as an example, this article details MCP's role in transforming development paradigms and expanding tool ecosystems.

---

## Glossary

| Term            | Definition                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Agent**    | In the context of LLMs, an AI Agent is an autonomous entity capable of understanding intent, planning decisions, and executing complex tasks. Unlike ChatGPT, it doesn't just advise "how to do" but actively "does it for you." If Copilot is a co-pilot, an Agent is the pilot. Mimicking human task execution, its core functionality revolves around three iterative steps: Perception, Planning, and Action. |
| **Copilot**     | An AI-powered assistant integrated into software to enhance productivity by analyzing user behavior, input, and history to provide real-time suggestions or automate tasks.                                                                                                                                                                                                                                       |
| **MCP**         | Model Context Protocol is an open standard governing how applications provide context to LLMs. Think of it as a USB-C port for AI—enabling standardized connections between models and external data/tools.                                                                                                                                                                                                       |
| **Agent TARS**  | An open-source multimodal AI agent seamlessly integrating with real-world tools.                                                                                                                                                                                                                                                                                                                                  |
| **RESTful API** | An architectural style for client-server interaction, based on design principles rather than strict standards.                                                                                                                                                                                                                                                                                                    |

---

## Overview

AI has evolved from dialogue-only Chatbots to decision-supporting Copilots and now autonomous Agents, demanding richer **context** and **tools** for task execution.

---

### Challenges

The lack of standardized context and tooling creates three major challenges:

1. **High Development Coupling**: Tool developers must deeply understand Agent internals, embedding tool code within the Agent layer, complicating development and debugging.
2. **Poor Tool Reusability**: Tight coupling with Agent code leads to inconsistent API adaptations, hindering cross-language reuse.
3. **Fragmented Ecosystem**: Without standards, tools (e.g., OpenAPIs) are incompatible across Agent ecosystems.

<p align="center">
   <img alt="Function Call Without MCP" width="600" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503260037073.png">
</p>

---

### Goal

> "All problems in computer science can be solved by another level of indirection" -- Butler Lampson

MCP decouples tools into a dedicated MCP Server layer, standardizing development and invocation. MCP Servers provide Agents with standardized access to context and tools.

<p align="center">
   <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503260020513.png">
</p>

---

## Demo

Three examples showcasing MCP's role in AI Agent applications:

| Instruction                                                    | Demo                                                                                                                                                                                                                        | MCP Servers Used                                                                                                                                               | Notes                           |
| :------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| Analyze a stock technically, then buy 3 shares at market price | [Replay](https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/report_1742741107345.html) <img width="500" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346944.png"> | [Broker MCP](https://github.com/longportapp/openapi/tree/main/mcp), [Filesystem MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) | Uses simulated trading account. |
| What are my machine's CPU, memory, and network speeds?         | [Replay](https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/report_1742745014696.html) <img width="500" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346946.png"> | [CLI MCP](https://github.com/g0t4/mcp-server-commands), [Code Exec MCP](https://github.com/formulahendry/mcp-server-code-runner)                               |                                 |
| Find top 5 upvoted products on ProductHunt                     | [Replay](https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/report_1742745636585.html) <img width="500" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346947.png"> | [Browser MCP](https://github.com/bytedance/UI-TARS-desktop/tree/fb2932afbdd54da757b9fae61e888fc8804e648f/packages/agent-infra/mcp-servers/browser)             |                                 |

> Current MCP customization is closed; third-party MCP Servers were manually mounted for testing.
> More: [https://agent-tars.com/showcase](https://agent-tars.com/showcase)

---

## Introduction

### What is MCP?

Model Context Protocol is a **standard protocol** by Anthropic for LLM-to-external communication (data/tools), based on [JSON-RPC 2.0](https://www.jsonrpc.org/specification). It acts as a **USB-C interface for AI**, standardizing context provision.

<p align="center">
   <img width="700" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346948.png">
</p>

---

#### Architecture

<p align="center">
   <img width="700" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346960.png">
</p>

- **MCP Client**: Communicates with Servers via MCP protocol (1:1 connection).
- **MCP Servers**: Provide context—Resources, Tools, Prompts—to Clients.
- **Language Support**: TypeScript, Python, Java, Kotlin, C#.

---

### Flowchart

MCP supplies LLMs with three context types: Resources, Prompts, and Tools.

<p align="center">
   <img width="400" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346961.png">
</p>

---

### MCP vs. Function Call

|                 | [MCP](https://modelcontextprotocol.io/introduction)                                                                                                   | [Function Call](https://platform.openai.com/docs/guides/function-calling)                                                               |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **Definition**  | Standard interface for model-device integration (Tools/Resources/Prompts).                                                                            | Flat tool listing for external data access. MCP Tools enforce input/output protocols.                                                   |
| **Protocol**    | JSON-RPC (bidirectional, discoverable, notifications). ![](https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346949.png) | JSON-Schema (static). <img width="400" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346950.png"> |
| **Invocation**  | Stdio/SSE/in-process calls.                                                                                                                           | In-process/language-native functions.                                                                                                   |
| **Use Case**    | Dynamic, complex interactions.                                                                                                                        | Single-tool, static executions.                                                                                                         |
| **Integration** | Complex.                                                                                                                                              | Simple.                                                                                                                                 |
| **Engineering** | High maturity.                                                                                                                                        | Low maturity.                                                                                                                           |

---

### MCP as Frontend-Backend Separation

Early web development coupled UIs with backend logic (JSP/PHP), mirroring today's Agent-tool entanglement. AJAX/Node.js/RESTful APIs enabled separation; MCP now does the same for AI:

- **Web**: Frontend (UI) ↔ Backend (APIs).
- **MCP**: Tool developers ↔ Agent developers.

This layering lets Agent developers compose tools like building blocks.

<p align="center">
   <img width="600" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346964.png">
</p>

---

## Practice

### Design Overview

The [MCP Browser Tool](https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/agent-infra/mcp-servers/browser) exemplifies the implementation. To ensure out-of-box usability (avoiding Node.js/UV dependencies per [issue#64](https://github.com/modelcontextprotocol/servers/issues/64)), we categorize tools as:

- **Built-in MCP Servers**: Fully MCP-compliant, supporting both Stdio and function calls ("MCP-standardized Function Calls").
- **Extended MCP Servers**: For advanced users with Npm/UV environments.

---

### MCP Server Development

Taking mcp-server-browser as an example, it is essentially an npm package with the following `package.json` configuration:

```json
{
  "name": "mcp-server-browser",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "mcp-server-browser": "dist/index.cjs"
  },
  "main": "dist/server.cjs",
  "module": "dist/server.js",
  "types": "dist/server.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "rm -rf dist && rslib build && shx chmod +x dist/*.{js,cjs}",
    "dev": "npx -y @modelcontextprotocol/inspector tsx src/index.ts"
  }
}
```

- `bin`: Stdio entry
- `main` / `module`: In-process function call entry

---

#### Development

In practice, using the [Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to develop and debug MCP Servers proves highly effective. By decoupling Agents from tools, developers can debug and develop tools independently.

Simply run `npm run dev` to launch a Playground containing all debuggable MCP Server features (Prompts, Resources, Tools, etc.).

```bash
$ npx -y @modelcontextprotocol/inspector tsx src/index.ts
Starting MCP inspector...
New SSE connection

Spawned stdio transport
Connected MCP client to backing server transport
Created web app transport
Set up MCP proxy

🔍 MCP Inspector is up and running at http://localhost:5173 🚀
```

![](https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346951.png)

> Note: console.log doesn't work in Inspector—debugging requires alternatives.

#### Implementation

##### Entry Points

To enable **in-process function calls** for built-in MCP Servers, we export three shared methods in the entry file `src/server.ts`:

- `listTools`: Enumerates all available functions
- `callTool`: Invokes specific functions
- `close`: Cleanup function when server is no longer needed

```TypeScript
// src/server.ts
export const client: Pick<Client, 'callTool' | 'listTools' | 'close'> = {
  callTool,
  listTools,
  close,
};
```

For _Stdio call support_, simply import the module in `src/index.ts`:

```TypeScript
#!/usr/bin/env node
// src/index.ts
import { client as mcpBrowserClient } from "./server.js";

const server = new Server(
  {
    name: "example-servers/puppeteer",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
// listTools
server.setRequestHandler(ListToolsRequestSchema, mcpBrowserClient.listTools);
// callTool
server.setRequestHandler(CallToolRequestSchema, async (request) =>
  return await mcpBrowserClient.callTool(request.params);
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on("close", () => {
  console.error("Browser MCP Server closed");
  server.close();
});
```

---

##### Tool Definition

The MCP protocol requires using JSON Schema to constrain tool inputs and outputs. Based on practical experience, we recommend using [zod](https://github.com/colinhacks/zod) to define a Zod Schema set, which is then converted to JSON Schema for MCP export.

```TypeScript
import { z } from 'zod';

const toolsMap = {
  browser_navigate: {
    description: 'Navigate to a URL',
    inputSchema: z.object({
      url: z.string(),
    }),
    handle: async (args) => {
      // Implements
      const clickableElements = ['...']
      return {
        content: [
          {
            type: 'text',
            text: `Navigated to ${args.url}\nclickable elements: ${clickableElements}`,
          },
        ],
        isError: false,
      }
    }
  },
  browser_scroll: {
    name: 'browser_scroll',
    description: 'Scroll the page',
    inputSchema: z.object({
      amount: z
        .number()
        .describe('Pixels to scroll (positive for down, negative for up)'),
    }),
    handle: async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: `Scrolled ${actualScroll} pixels. ${
              isAtBottom
                ? 'Reached the bottom of the page.'
                : 'Did not reach the bottom of the page.'
            }`,
          },
        ],
        isError: false,
      };
    }
  },
  // more
};

const callTool = async ({ name, arguments: toolArgs }) => {
  return handlers[name].handle(toolArgs);
}
```

> **Pro Tip**: Unlike OpenAPI's structured data returns, MCP responses are specifically designed for LLM models. To better bridge models and tools, returned text and tool descriptions should be more semantic, improving model comprehension and tool invocation success rates.
> For example, `browser_scroll` should return page scroll status after each execution (e.g., remaining pixels to bottom, whether bottom reached). This enables models to provide more precise parameters in subsequent calls.

---

### Agent Integration

After developing the MCP Server, it needs to be integrated into the Agent application. In principle, the Agent shouldn't need to concern itself with the specific details of tools, inputs, and outputs provided by MCP Servers.

#### MCP Servers Configuration

MCP Servers configuration is divided into "Built-in Servers" and "User Extension Servers". Built-in Servers use in-process Function Calls to ensure out-of-the-box functionality for novice users, while Extension Servers provide advanced users with expanded Agent capabilities.

```TypeScript
{
    // Internal MCP Servers(in-process call)
    fileSystem: {
      name: 'fileSystem',
      localClient: mcpFsClient,
    },
    commands: {
      name: 'commands',
      localClient: mcpCommandClient,
    },
    browser: {
      name: 'browser',
      localClient: mcpBrowserClient,
    },

    // External MCP Servers(remote call)
    fetch: {
      command: 'uvx',
      args: ['mcp-server-fetch'],
    },
    longbridge: {
      command: 'longport-mcp',
      args: [],
      env: {}
    }
}
```

---

#### MCP Client

The core mission of the MCP Client is to integrate MCP Servers with different invocation methods (Stdio/SSE/Function Call). The Stdio and SSE implementations directly reuse the [Official Examples](https://modelcontextprotocol.io/quickstart/client). Here we focus on how Function Call support was implemented in the Client.

##### Function Call Invocation

```diff
export type MCPServer<ServerNames extends string = string> = {
  name: ServerNames;
  status: 'activate' | 'error';
  description?: string;
  env?: Record<string, string>;
+ /** same-process call, same as function call */
+ localClient?: Pick<Client, 'callTool' | 'listTools' | 'close'>;
  /** Stdio server */
  command?: string;
  args?: string[];
};
```

The MCP Client invocation works as follows:

```TypeScript
import { client as mcpBrowserClient } from '@agent-infra/mcp-server-browser';

 const client = new MCPClient([
    {
      name: 'browser',
      description: 'web browser tools',
      localClient: mcpBrowserClient,
    }
]);

const mcpTools = await client.listTools();

const response = await openai.chat.completions.create({
  model,
  messages,
  // Different model vendors need to convert to the corresponding tools data format.
  tools: convertToTools(tools),
  tool_choice: 'auto',
});
```

At this point, the entire MCP workflow has been fully implemented, covering all aspects from Server configuration, Client integration to Agent connectivity. More MCP details/code have been open-sourced on GitHub: [Agent Integration](https://github.com/bytedance/UI-TARS-desktop/blob/fb2932afbdd54da757b9fae61e888fc8804e648f/apps/agent-tars/src/main/llmProvider/index.ts#L89-L91), [mcp-client](https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/agent-infra/mcp-client), [mcp-servers](https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/agent-infra/mcp-servers)

---

## Insights

### Ecosystem

The MCP ecosystem continues to grow, with increasing applications supporting MCP and open platforms providing MCP Servers. Services like [Cloudflare](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/) and [Composio](https://mcp.composio.dev/), [Zapier](https://zapier.com/mcp) use SSE to host MCP (i.e., connecting one MCP Endpoint grants access to multiple MCP Servers). The ideal scenario for Stdio implementation would be running MCP Servers and Agent systems within the same Docker container.

<p align="center">
   <img width="800" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/zyha-pb/ljhwZthlaukjlkulzlp/202503252346952.png">
</p>

---

### Future

- Current MCP lacks mature standardization and engineering frameworks
- According to the [MCP Roadmap](https://modelcontextprotocol.io/development/roadmap), three key initiatives are planned:
  - Remote MCP Support: Authentication, service discovery, stateless services - clearly targeting a K8S architecture to build production-ready, scalable MCP services. The recent [RFC Replace HTTP+SSE with new "Streamable HTTP" transport](https://github.com/modelcontextprotocol/specification/pull/206) proposes Streamable HTTP for low-latency bidirectional communication.
  - Agent Support: Cross-domain workflows with better human-Agent interaction.
  - Developer Ecosystem: Expand MCP Servers ecosystem.
- **MCP Model & RL**: Models need dynamic MCP tool-library generalization
- **Agent K8S**: While standardized communication protocols between LLMs and context have been established, unified standards for Agent interaction protocols remain undeveloped. Production-level challenges like Agent service discovery, recovery, and monitoring await solutions. Current explorations like [ANP (Agent Network Protocol)](https://agent-network-protocol.com/) are attempting to address these areas.
