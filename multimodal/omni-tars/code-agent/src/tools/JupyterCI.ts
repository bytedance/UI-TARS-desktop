/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { AioClient } from './AioFetch';

export class JupyterCIProvider {
  private client: AioClient;

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
        return (
          await this.client.jupyterExecute({
            code,
            timeout,
            kernel_name: 'python3',
          })
        ).data;
      },
    });
  }
}
