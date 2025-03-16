#!/usr/bin/env node
/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/index.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import os from 'node:os';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  PromptMessage,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { client as mcpCommandsClient } from './server.js';

import { createRequire } from 'module';
import { always_log } from './server.js';
const require = createRequire(import.meta.url);
const {
  name: package_name,
  version: package_version,
} = require('../package.json');

// TODO use .promises? in node api
const execAsync = promisify(exec);

let verbose = false;
// check CLI args:
if (process.argv.includes('--verbose')) {
  verbose = true;
}

const server = new Server(
  {
    name: package_name,
    version: package_version,
    description: 'Run commands on this ' + os.platform() + ' machine',
  },
  {
    capabilities: {
      //resources: {},
      tools: {},
      prompts: {},
      //logging: {}, // for logging messages that don't seem to work yet or I am doing them wrong
    },
  },
);

if (verbose) {
  always_log('INFO: verbose logging enabled');
} else {
  always_log('INFO: verbose logging disabled, enable it with --verbose');
}

function verbose_log(message: string, data?: any) {
  // https://modelcontextprotocol.io/docs/tools/debugging - mentions various ways to debug/troubleshoot (including dev tools)
  //
  // remember STDIO transport means can't log over STDOUT (client expects JSON messages per the spec)
  // https://modelcontextprotocol.io/docs/tools/debugging#implementing-logging
  //   mentions STDERR is captured by the host app (i.e. Claude Desktop app)
  //   server.sendLoggingMessage is captured by MCP client (not Claude Desktop app)
  //   SO, IIUC use STDERR for logging into Claude Desktop app logs in:
  //      '~/Library/Logs/Claude/mcp.log'
  if (verbose) {
    always_log(message, data);
  }
  // inspector, catches these logs and shows them on left hand side of screen (sidebar)

  // TODO add verbose parameter (CLI arg?)

  // IF I wanted to log via MCP client logs (not sure what those are/do):
  //  I do not see inspector catching these logs :(, there is a server notifications section and it remains empty
  //server.sendLoggingMessage({
  //    level: "info",
  //    data: message,
  //});
  // which results in something like:
  //server.notification({
  //    method: "notifications/message",
  //    params: {
  //        level: "warning",
  //        logger: "mcp-server-commands",
  //        data: "ListToolsRequest2",
  //    },
  //});
  //
  // FYI client should also requets a log level from the server, so that needs to be here at some point too
}

server.setRequestHandler(ListToolsRequestSchema, mcpCommandsClient.listTools);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  verbose_log('INFO: ToolRequest', request);
  return mcpCommandsClient.callTool(request.params);
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  verbose_log('INFO: ListPrompts');
  return {
    prompts: [
      {
        name: 'run_command',
        description:
          'Include command output in the prompt. Instead of a tool call, the user decides what commands are relevant.',
        arguments: [
          {
            name: 'command',
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== 'run_command') {
    throw new Error('Unknown prompt');
  }
  verbose_log('INFO: PromptRequest', request);

  const command = String(request.params.arguments?.command);
  if (!command) {
    throw new Error('Command is required');
  }
  // Is it possible/feasible to pass a path for the CWD when running the command?
  // - currently it uses / (yikez)
  // - IMO makes more sense to have it be based on the Zed CWD of each project
  // - Fallback could be to configure on server level (i.e. home dir of current user) - perhaps CLI arg? (thinking of zed's context_servers config section)

  const { stdout, stderr } = await execAsync(command);
  // TODO gracefully handle errors and turn them into a prompt message that can be used by LLM to troubleshoot the issue, currently errors result in nothing inserted into the prompt and instead it shows the Zed's chat panel as a failure

  const messages: PromptMessage[] = [
    {
      role: 'user',
      content: {
        type: 'text',
        text:
          'I ran the following command, if there is any output it will be shown below:\n' +
          command,
      },
    },
  ];
  if (stdout) {
    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text: 'STDOUT:\n' + stdout,
      },
    });
  }
  if (stderr) {
    messages.push({
      role: 'user',
      content: {
        type: 'text',
        text: 'STDERR:\n' + stderr,
      },
    });
  }
  verbose_log('INFO: PromptResponse', messages);
  return { messages };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
