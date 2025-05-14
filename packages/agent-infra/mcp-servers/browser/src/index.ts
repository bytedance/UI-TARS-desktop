#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRequire } from 'module';
import { createServer, getBrowser } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

declare global {
  interface Window {
    mcpHelper: {
      logs: string[];
      originalConsole: Partial<typeof console>;
    };
  }
}

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .option('--headless', 'Browser headless mode', false)
  .option('--executablePath <executablePath>', 'Browser executable path')
  .option('--browserType <browserType>', 'Browser type')
  .action(async (options) => {
    try {
      console.log('[mcp-server-browser] options', options);

      const server: McpServer = createServer({
        launchOptions: {
          headless: options.headless,
          executablePath: options.executablePath,
          browserType: options.browserType,
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
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  });

program.parse();

process.stdin.on('close', () => {
  const { browser } = getBrowser();
  console.error('Puppeteer MCP Server closed');
  browser?.close();
});
