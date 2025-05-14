#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/puppeteer/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, getBrowser } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

declare global {
  interface Window {
    mcpHelper: {
      logs: string[];
      originalConsole: Partial<typeof console>;
    };
  }
}

async function runServer() {
  const server: McpServer = createServer({
    launchOptions: {
      headless: false,
    },
    logger: {
      info: (...args: any[]) => {
        server.server.notification({
          method: 'notifications/message',
          params: {
            level: 'warning',
            logger: 'mcp-server-browser',
            data: JSON.stringify(args),
          },
        });

        server.server.sendLoggingMessage({
          level: 'info',
          data: JSON.stringify(args),
        });
      },
      error: (...args: any[]) => {
        server.server.sendLoggingMessage({
          level: 'error',
          data: JSON.stringify(args),
        });
      },
      warn: (...args: any[]) => {
        server.server.sendLoggingMessage({
          level: 'warning',
          data: JSON.stringify(args),
        });
      },
      debug: (...args: any[]) => {
        server.server.sendLoggingMessage({
          level: 'debug',
          data: JSON.stringify(args),
        });
      },
    },
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);

process.stdin.on('close', () => {
  const { browser } = getBrowser();
  console.error('Puppeteer MCP Server closed');
  browser?.close();
});
