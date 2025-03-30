/**
 * The following code is modified based on
 * https://github.com/g0t4/mcp-server-commands/blob/master/src/index.ts
 *
 * MIT License
 * Copyright (c) 2025 g0t4
 * https://github.com/g0t4/mcp-server-commands/blob/master/LICENSE
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { z } from 'zod';
import os from 'node:os';
import { exec, ExecOptions } from 'node:child_process';
import { ObjectEncodingOptions } from 'node:fs';
import { promisify } from 'node:util';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CallToolResult,
  TextContent,
  ToolSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { execFileWithInput, ExecResult } from './exec-utils.js';

// TODO use .promises? in node api
const execAsync = promisify(exec);

function messagesFor(result: ExecResult): TextContent[] {
  const messages: TextContent[] = [];
  if (result.message) {
    messages.push({
      // most of the time this is gonna match stderr, TODO do I want/need both error and stderr?
      type: 'text',
      text: result.message,
      name: 'ERROR',
    });
  }
  if (result.stdout) {
    messages.push({
      type: 'text',
      text: result.stdout,
      name: 'STDOUT',
    });
  }
  if (result.stderr) {
    messages.push({
      type: 'text',
      text: result.stderr,
      name: 'STDERR',
    });
  }
  return messages;
}

export function always_log(message: string, data?: any) {
  if (data) {
    console.error(message + ': ' + JSON.stringify(data));
  } else {
    console.error(message);
  }
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

const toolsMap = {
  run_command: {
    name: 'run_command',
    description: 'Run a command on this ' + os.platform() + ' machine',
    inputSchema: z.object({
      command: z.string().describe('Command with args'),
      cwd: z
        .string()
        .optional()
        .describe('Current working directory, leave empty in most cases'),
    }),
  },
  run_script: {
    name: 'run_script',
    description: 'Run a script on this ' + os.platform() + ' machine',
    inputSchema: z.object({
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
    }),
  },
};

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;
type ToolNames = keyof typeof toolsMap;
type ToolInputMap = {
  [K in ToolNames]: z.infer<(typeof toolsMap)[K]['inputSchema']>;
};

const listTools: Client['listTools'] = async () => {
  const mcpTools = Object.keys(toolsMap || {}).map((key) => {
    const name = key as ToolNames;
    const tool = toolsMap[name];
    return {
      // @ts-ignore
      name: tool?.name || name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema) as ToolInput,
    };
  });

  return {
    tools: mcpTools,
  };
};

const callTool: Client['callTool'] = async ({
  name,
  arguments: toolArgs,
}): Promise<CallToolResult> => {
  const handlers: {
    [K in ToolNames]: (args: ToolInputMap[K]) => Promise<CallToolResult>;
  } = {
    run_command: async (args) => {
      const { command, cwd } = args;
      const response = await runCommand(args);

      return {
        ...response,
        toolResult: response,
      };
    },
    run_script: async (args) => {
      const response = await runScript(args);
      return {
        toolResult: response,
        ...response,
      };
    },
  };

  if (handlers[name as ToolNames]) {
    return handlers[name as ToolNames](toolArgs as any);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
};

const close: Client['close'] = async () => {
  return;
};

// https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/utilities/ping/#behavior-requirements
const ping: Client['ping'] = async () => {
  return {
    _meta: {},
  };
};

export const client: Pick<Client, 'callTool' | 'listTools' | 'close' | 'ping'> =
  {
    callTool,
    listTools,
    close,
    ping,
  };
