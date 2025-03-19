#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/puppeteer/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  client as mcpBrowserClient,
  getBrowser,
  getScreenshots,
  setConfig,
} from './server.js';

let initialBrowserSetup = false;

const consoleLogs: string[] = [];

declare global {
  interface Window {
    mcpHelper: {
      logs: string[];
      originalConsole: Partial<typeof console>;
    };
  }
}

setConfig({
  launchOptions: {
    headless: false,
  },
  logger: {
    info: (...args: any[]) => {
      server.notification({
        method: 'notifications/message',
        params: {
          level: 'warning',
          logger: 'mcp-server-browser',
          data: JSON.stringify(args),
        },
      });

      server.sendLoggingMessage({
        level: 'info',
        data: JSON.stringify(args),
      });
    },
    error: (...args: any[]) => {
      server.sendLoggingMessage({
        level: 'error',
        data: JSON.stringify(args),
      });
    },
    warn: (...args: any[]) => {
      server.sendLoggingMessage({
        level: 'warning',
        data: JSON.stringify(args),
      });
    },
    debug: (...args: any[]) => {
      server.sendLoggingMessage({
        level: 'debug',
        data: JSON.stringify(args),
      });
    },
  },
});

async function handleToolCall(name: string, args: any) {
  const result = await mcpBrowserClient.callTool({
    name,
    arguments: args,
  });
  const { page } = getBrowser();

  if (page && !initialBrowserSetup) {
    page.on('console', (msg) => {
      const logEntry = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logEntry);
      server.notification({
        method: 'notifications/resources/updated',
        params: { uri: 'console://logs' },
      });
    });
    initialBrowserSetup = true;
  }

  switch (name) {
    case 'browser_screenshot':
      server.notification({
        method: 'notifications/resources/list_changed',
      });
      break;
  }
  return result;
}

const server = new Server(
  {
    name: 'example-servers/puppeteer',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// Setup request handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const screenshots = getScreenshots();
  return {
    resources: [
      {
        uri: 'console://logs',
        mimeType: 'text/plain',
        name: 'Browser console logs',
      },
      ...Array.from(screenshots.keys()).map((name) => ({
        uri: `screenshot://${name}`,
        mimeType: 'image/png',
        name: `Screenshot: ${name}`,
      })),
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === 'console://logs') {
    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: consoleLogs.join('\n'),
        },
      ],
    };
  }

  if (uri.startsWith('screenshot://')) {
    const screenshots = getScreenshots();
    const name = uri.split('://')[1];
    const screenshot = screenshots.get(name);
    if (screenshot) {
      return {
        contents: [
          {
            uri,
            mimeType: 'image/png',
            blob: screenshot,
          },
        ],
      };
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

server.setRequestHandler(ListToolsRequestSchema, mcpBrowserClient.listTools);

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments ?? {}),
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on('close', () => {
  const { browser } = getBrowser();
  console.error('Puppeteer MCP Server closed');
  browser?.close();
  server.close();
});
