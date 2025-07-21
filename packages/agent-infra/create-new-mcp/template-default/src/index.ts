#!/usr/bin/env node
import { startSseAndStreamableHttpMcpServer } from 'mcp-http-server';
import { program } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createServer } from './server.js';

program
  .name(process.env.NAME || 'mcp-server-{{name}}')
  .description(process.env.DESCRIPTION || 'MCP server for {{name}}')
  .version(process.env.VERSION || '0.0.1')
  .option(
    '--host <host>',
    'host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.',
  )
  .option('--port <port>', 'port to listen on for SSE and HTTP transport.')
  .action(async (options) => {
    try {
      if (options.port || options.host) {
        await startSseAndStreamableHttpMcpServer({
          host: options.host,
          port: options.port,
          // @ts-expect-error: CommonJS and ESM compatibility
          createMcpServer: async (req) => {
            const server: McpServer = await createServer();
            return server;
          },
        });
      } else {
        // process.env.${key}
        const server = await createServer();
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.debug('{{name}} MCP Server running on stdio');
      }
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  });

program.parse();
