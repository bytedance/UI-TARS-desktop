/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { AioClient } from '@agent-infra/sandbox';

export class ExcuteBashProvider {
  private client: AioClient;

  constructor(client: AioClient) {
    this.client = client;
  }

  getTool(): Tool {
    return new Tool({
      id: 'execute_bash',
      description: '',
      parameters: z.object({
        command: z.string().describe('Execute a bash command in the terminal.'),
      }),
      function: async ({ command }) => {
        return (
          await this.client.shellExec(
            { command },
            {
              timeout: 1000 * 120, // excute bash set 2min timeout
            },
          )
        ).data;
      },
    });
  }
}
