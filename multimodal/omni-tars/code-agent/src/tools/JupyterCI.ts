/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { AioClient } from '@agent-infra/sandbox';

export class JupyterCIProvider {
  private client: AioClient;
  private sessionId = '';

  constructor(client: AioClient) {
    this.client = client;
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
        const resp = await this.client.jupyterExecute({
          code,
          timeout,
          session_id: this.sessionId,
          kernel_name: 'python3',
        });

        // Update session_id. The aio mechanism is that the non-existent session_id will be automatically created.
        if (resp.data?.session_id !== this.sessionId) {
          this.sessionId = resp.data?.session_id ?? '';
        }

        return resp.data;
      },
    });
  }
}
