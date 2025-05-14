#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, getAllowedDirectories } from './server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Command line argument parsinggetAllowedDirectories,
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    'Usage: mcp-server-filesystem <allowed-directory> [additional-directories...]',
  );
  process.exit(1);
}

// Start server
async function runServer() {
  const server: McpServer = createServer({
    allowedDirectories: args,
  });
  const allowedDirectories = getAllowedDirectories();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Secure MCP Filesystem Server running on stdio');
  console.error('Allowed directories:', allowedDirectories);
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
