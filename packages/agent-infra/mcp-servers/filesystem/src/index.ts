#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, getAllowedDirectories } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';

program
  .name(process.env.NAME || 'mcp-server-filesystem')
  .description(process.env.DESCRIPTION || 'MCP server for filesystem')
  .version(process.env.VERSION || '0.0.1')
  .option(
    '--allowed-directories <dir>',
    'allowed directories to serve',
    (val, prev: string[]) => (prev ? prev.concat(val) : [val]),
    [],
  )
  .option(
    '--host <host>',
    'host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.',
  )
  .option('--port <port>', 'port to listen on for SSE and HTTP transport.')
  .action(async (options) => {
    try {
      if (!options.allowedDirectories?.length) {
        console.error(
          'Usage: mcp-server-filesystem --allowed-directories <allowed-directories>',
        );
        process.exit(1);
      }

      const createMcpServer = async () => {
        const server: McpServer = createServer({
          allowedDirectories: options.allowedDirectories,
        });
        return server;
      };
      const allowedDirectories = getAllowedDirectories();

      console.error('Secure MCP Filesystem Server running on stdio');
      console.error('Allowed directories:', allowedDirectories);

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
        console.debug('Secure MCP Filesystem Server running on stdio');
      }
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  });

program.parse();
