/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/index.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import os from 'node:os';
import { exec, ExecOptions } from 'node:child_process';
import { ObjectEncodingOptions } from 'node:fs';
import { promisify } from 'node:util';
import {
  CallToolResult,
  PromptMessage,
} from '@modelcontextprotocol/sdk/types.js';

import {
  execFileWithInput,
  ExecResult,
  messagesFor,
  always_log,
} from './exec-utils.js';

// TODO use .promises? in node api
const execAsync = promisify(exec);

function createServer(): McpServer {
  const server = new McpServer({
    name: 'Run Commands',
    version: process.env.VERSION || '0.0.1',
  });

  // === Tools ===
  server.tool(
    'run_command',
    'Run a command on this ' + os.platform() + ' machine',
    {
      command: z.string().describe('Command with args'),
      cwd: z
        .string()
        .optional()
        .describe('Current working directory, leave empty in most cases'),
    },
    async (args) => await runCommand(args),
  );

  server.tool(
    'run_script',
    'Run a script on this ' + os.platform() + ' machine',
    {
      interpreter: z
        .string()
        .optional()
        .describe(
          'Command with arguments. Script will be piped to stdin. Examples: bash, fish, zsh, python, or: bash --norc',
        ),
      script: z.string().describe('Script to run'),
      cwd: z
        .string()
        .optional()
        .describe('Current working directory, leave empty in most cases'),
    },
    async (args) => await runScript(args),
  );

  // ==== Prompts ====
  server.prompt(
    'run_command',
    'Include command output in the prompt. Instead of a tool call, the user decides what commands are relevant.',
    {
      command: z.string().describe('Command with args'),
    },
    async ({ command }) => {
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
      always_log('INFO: PromptResponse', messages);
      return { messages };
    },
  );

  return server;
}

async function runCommand(
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  const command = String(args?.command);
  if (!command) {
    throw new Error('Command is required');
  }

  const options: ExecOptions = {};
  if (args?.cwd) {
    options.cwd = String(args.cwd);
    // ENOENT is thrown if the cwd doesn't exist, and I think LLMs can understand that?
  }

  try {
    const result = await execAsync(command, options);
    console.log('execute command result', result);
    return {
      isError: false,
      content: messagesFor(result),
    };
  } catch (error) {
    // TODO catch for other errors, not just ExecException
    // FYI failure may not always be a bad thing if for example checking for a file to exist so just keep that in mind in terms of logging?
    const response = {
      isError: true,
      content: messagesFor(error as ExecResult),
    };
    always_log('WARN: run_command failed', response);
    return response;
  }
}

async function runScript(
  args: Record<string, unknown> | undefined,
): Promise<CallToolResult> {
  const interpreter = String(args?.interpreter);
  if (!interpreter) {
    throw new Error('Interpreter is required');
  }

  const options: ObjectEncodingOptions & ExecOptions = {
    //const options = {
    // constrains typescript too, to string based overload
    encoding: 'utf8',
  };
  if (args?.cwd) {
    options.cwd = String(args.cwd);
    // ENOENT is thrown if the cwd doesn't exist, and I think LLMs can understand that?
  }

  const script = String(args?.script);
  if (!script) {
    throw new Error('Script is required');
  }

  try {
    const result = await execFileWithInput(interpreter, script, options);
    return {
      isError: false,
      content: messagesFor(result),
    };
  } catch (error) {
    const response = {
      isError: true,
      content: messagesFor(error as ExecResult),
    };
    always_log('WARN: run_script failed', response);
    return response;
  }
}

export { createServer };
