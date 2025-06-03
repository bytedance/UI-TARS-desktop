#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/index.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from './server.js';

program
  .name(process.env.NAME || 'mcp-server-commands')
  .description(process.env.DESCRIPTION || 'MCP server for commands')
  .version(process.env.VERSION || '0.0.1')
  .option(
    '--host <host>',
    'host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.',
  )
  .option('--port <port>', 'port to listen on for SSE and HTTP transport.')
  .action(async (options) => {
    try {
      const createMcpServer = async () => {
        const server: McpServer = createServer();
        return server;
      };
      if (options.port || options.host) {
        await startSseAndStreamableHttpMcpServer({
          host: options.host,
          port: options.port,
          // @ts-expect-error: CommonJS and ESM compatibility
          createMcpServer: async () => createMcpServer(),
        });
      } else {
        const server = await createMcpServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.debug('Commands MCP Server running on stdio');
      }
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  });

program.parse();
