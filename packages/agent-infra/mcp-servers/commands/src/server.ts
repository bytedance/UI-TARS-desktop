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
import {
  evaluateCommandSafety,
  formatSafetyDecision,
  type CommandSafetyPolicyConfig,
} from './safety-policy.js';

// TODO use .promises? in node api
const execAsync = promisify(exec);

type CommandServerConfig = {
  cwd?: string;
  safety?: CommandSafetyPolicyConfig;
};

function createServer(serverConfig?: CommandServerConfig): McpServer {
  const server = new McpServer({
    name: 'Run Commands',
    version: process.env.VERSION || '0.0.1',
  });
  const safetyPolicy = serverConfig?.safety;

  // === Tools ===
  // @ts-ignore
  server.registerTool(
    'run_command',
    {
      description: 'Run a command on this ' + os.platform() + ' machine',
      inputSchema: {
        command: z.string().describe('Command with args'),
        cwd: z
          .string()
          .default(serverConfig?.cwd ?? '')
          .optional()
          .describe('Current working directory, leave empty in most cases'),
      },
    },
    async (args) => await runCommand(args, safetyPolicy),
  );

  server.registerTool(
    'run_script',
    {
      description: 'Run a script on this ' + os.platform() + ' machine',
      inputSchema: {
        interpreter: z
          .string()
          .optional()
          .describe(
            'Command with arguments. Script will be piped to stdin. Examples: bash, fish, zsh, python, or: bash --norc',
          ),
        script: z.string().describe('Script to run'),
        cwd: z
          .string()
          .default(serverConfig?.cwd ?? '')
          .optional()
          .describe('Current working directory, leave empty in most cases'),
      },
    },
    async (args) => await runScript(args, safetyPolicy),
  );

  // ==== Prompts ====
  server.registerPrompt(
    'run_command',
    {
      title: 'Run Command',
      description:
        'Include command output in the prompt. Instead of a tool call, the user decides what commands are relevant.',
      argsSchema: {
        command: z.string().describe('Command with args'),
      },
    },
    async ({ command }) => {
      const safetyDecision = evaluateCommandSafety(
        {
          toolName: 'prompt/run_command',
          command,
        },
        safetyPolicy,
      );
      if (safetyDecision.action !== 'allow') {
        const messages: PromptMessage[] = [
          {
            role: 'user',
            content: {
              type: 'text',
              text: formatSafetyDecision(safetyDecision),
            },
          },
        ];
        always_log('WARN: run_command prompt blocked by safety policy', {
          action: safetyDecision.action,
          ruleId: safetyDecision.ruleId,
          approvalRequestId: safetyDecision.approvalRequestId,
        });
        return { messages };
      }

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
  safetyPolicy?: CommandSafetyPolicyConfig,
): Promise<CallToolResult> {
  const command = stringArg(args?.command);
  if (!command?.trim()) {
    throw new Error('Command is required');
  }

  const cwd = stringArg(args?.cwd);
  const safetyDecision = evaluateCommandSafety(
    {
      toolName: 'run_command',
      command,
      cwd,
    },
    safetyPolicy,
  );
  if (safetyDecision.action !== 'allow') {
    return blockedToolResult(safetyDecision);
  }

  const options: ExecOptions = {};
  if (cwd) {
    options.cwd = cwd;
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
  safetyPolicy?: CommandSafetyPolicyConfig,
): Promise<CallToolResult> {
  const interpreter = stringArg(args?.interpreter);
  if (!interpreter?.trim()) {
    throw new Error('Interpreter is required');
  }

  const options: ObjectEncodingOptions & ExecOptions = {
    //const options = {
    // constrains typescript too, to string based overload
    encoding: 'utf8',
  };
  const cwd = stringArg(args?.cwd);
  if (cwd) {
    options.cwd = cwd;
    // ENOENT is thrown if the cwd doesn't exist, and I think LLMs can understand that?
  }

  const script = stringArg(args?.script);
  if (!script?.trim()) {
    throw new Error('Script is required');
  }

  const safetyDecision = evaluateCommandSafety(
    {
      toolName: 'run_script',
      interpreter,
      script,
      cwd,
    },
    safetyPolicy,
  );
  if (safetyDecision.action !== 'allow') {
    return blockedToolResult(safetyDecision);
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

function blockedToolResult(
  safetyDecision: ReturnType<typeof evaluateCommandSafety>,
): CallToolResult {
  const response = {
    isError: true,
    content: [
      {
        type: 'text' as const,
        name: 'SAFETY_POLICY',
        text: formatSafetyDecision(safetyDecision),
      },
    ],
  };
  always_log('WARN: command blocked by safety policy', {
    action: safetyDecision.action,
    ruleId: safetyDecision.ruleId,
    approvalRequestId: safetyDecision.approvalRequestId,
  });
  return response;
}

function stringArg(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export { createServer };
export {
  evaluateCommandSafety,
  formatSafetyDecision,
  DEFAULT_COMMAND_SAFETY_RULES,
} from './safety-policy.js';
export type {
  CommandSafetyAction,
  CommandSafetyDecision,
  CommandSafetyPolicyConfig,
  CommandSafetyRule,
  CommandSafetySubject,
} from './safety-policy.js';
export type { CommandServerConfig };
