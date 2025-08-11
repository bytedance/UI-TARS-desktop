/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from './mcp';

export class JupyterCIProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'JupyterCI',
      description: '',
      parameters: z.object({
        code: z.string().describe('code'),
        timeout: z.number().describe('timeout in seconds').optional(),
      }),
      function: async ({ code, timeout }) => {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.AIO,
          // name: 'JupyterCI',
          name: 'sandbox__execute_jupyter_code_v1_jupyter_execute_post',
          args: {
            code,
            timeout,
            kernel_name: 'python3',
          },
        });
      },
    });
  }
}
