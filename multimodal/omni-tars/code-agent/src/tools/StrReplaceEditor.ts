/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { AioClient } from '@agent-infra/sandbox';

export class StrReplaceEditorProvider {
  private client: AioClient;

  constructor(client: AioClient) {
    this.client = client;
  }

  getTool(): Tool {
    return new Tool({
      id: 'str_replace_editor',
      description: '',
      parameters: z.object({
        command: z.string().describe('The commands to run'),
        path: z.string().describe('Absolute path to file or directory'),
        file_text: z.string().describe('Required parameter of `create` command').optional(),
        old_str: z
          .string()
          .describe(
            'Required parameter of `str_replace` command containing the string in `path` to replace',
          )
          .optional(),
        new_str: z
          .string()
          .describe(
            ' Optional parameter of `str_replace` command containing the new string (if not given, no string will be added). Required parameter of `insert` command containing the string to insert',
          )
          .optional(),
        insert_line: z
          .string()
          .describe(
            'Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.',
          )
          .optional(),
        view_range: z
          .array(z.number())
          .describe('Optional parameter of `view` command when `path` points to a file. ')
          .optional(),
      }),
      function: async (args) => {
        if (typeof args.view_range === 'string') {
          try {
            args.view_range = JSON.parse(args.view_range);
          } catch (e) {
            throw new Error(`str_replace_editor view_range parameter invalid: ${args.view_range}`);
          }
        }

        return (await this.client.fileEditor(args)).data;
      },
    });
  }
}
