#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/index.ts
 *
 * MIT License
 * Copyright (c) 2024 Anthropic, PBC
 * https://github.com/modelcontextprotocol/servers/blob/main/LICENSE
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  client as filesystemClient,
  getAllowedDirectories,
  setAllowedDirectories,
} from './server.js';

// Command line argument parsinggetAllowedDirectories,
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    'Usage: mcp-server-filesystem <allowed-directory> [additional-directories...]',
  );
  process.exit(1);
}

try {
  setAllowedDirectories(args);
} catch (error) {
  console.error('Error setting allowed directories:', error);
  process.exit(1);
}

const allowedDirectories = getAllowedDirectories();

// Server setup
const server = new Server(
  {
    name: 'secure-filesystem-server',
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, filesystemClient.listTools);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return filesystemClient.callTool(request.params);
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Secure MCP Filesystem Server running on stdio');
  console.error('Allowed directories:', allowedDirectories);
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

export { setAllowedDirectories };
