/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from './mcp';

export class ExcuteBashProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'execute_bash',
      description: '',
      parameters: z.object({
        command: z.string().describe('Execute a bash command in the terminal.'),
      }),
      function: async ({ command }) => {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.AIO,
          // name: 'execute_bash',
          name: 'sandbox__exec_command_v1_shell_exec_post',
          args: {
            command,
          },
        });
      },
    });
  }
}
