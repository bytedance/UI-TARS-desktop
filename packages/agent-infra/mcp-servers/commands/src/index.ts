#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/index.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createServer } from './server.js';

async function runServer(): Promise<void> {
  const server: McpServer = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.debug('Commands MCP Server running on stdio');
}

runServer().catch(console.error);
