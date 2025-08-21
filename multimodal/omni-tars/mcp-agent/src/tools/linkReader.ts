/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool, z } from '@tarko/agent';
import { McpManager } from './mcp';

export class LinkReaderToolProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'LinkReader',
      description: '',
      parameters: z.object({
        description: z
          .string()
          .describe('A detailed description of the content to be extracted from the current URL.'),
        url: z
          .string()
          .describe('The target link, which should be a complete URL (starting with http).'),
      }),
      function: async ({ description, url }) => {
        // Priority use of LinkReaderPrompt mcp
        // if (process.env.LINK_READER_URL) {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.LinkReader,
          name: 'text_browser_view',
          args: {
            url,
            description,
          },
        });
        // }

        // return this.mcpManager.client.callTool({
        //   client: McpManager.McpClientType.Tavily,
        //   name: 'tavily_extract',
        //   args: {
        //     extract_depth: 'basic',
        //     format: 'markdown',
        //     include_favicon: false,
        //     include_images: false,
        //     urls: [url],
        //   },
        // });
      },
    });
  }
}
