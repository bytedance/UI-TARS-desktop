#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import os from 'node:os';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import { client as mcpSearchClient } from './server.js';
import { always_log } from './utils.js';

const require = createRequire(import.meta.url);
const {
  name: package_name,
  version: package_version,
} = require('../package.json');

let verbose = false;

if (process.argv.includes('--verbose')) {
  verbose = true;
}

function verbose_log(message: string, data?: any) {
  if (verbose) {
    always_log(message, data);
  }
}

const server = new Server(
  {
    name: package_name,
    version: package_version,
    description: 'Search the web on this ' + os.platform() + ' machine',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

if (verbose) {
  always_log('INFO: verbose logging enabled');
} else {
  always_log('INFO: verbose logging disabled, enable it with --verbose');
}

server.setRequestHandler(ListToolsRequestSchema, mcpSearchClient.listTools);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  verbose_log('INFO: ToolRequest', request);
  return mcpSearchClient.callTool(request.params);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
