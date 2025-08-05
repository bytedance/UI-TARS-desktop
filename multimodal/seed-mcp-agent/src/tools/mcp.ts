/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MCPClient } from '@agent-infra/mcp-client';

export interface McpManagerOptions {
  googleApiKey: string;
  tavilyApiKey: string;
}

export class McpManager {
  static McpClientType = {
    Tavily: 'tavily_client',
    Google: 'google_search_client',
    ShellCI: 'shell_ci_client',
  };

  public client: MCPClient;

  constructor(options: McpManagerOptions) {
    this.client = new MCPClient([
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Tavily,
        description: 'tavily search tool',
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${options.tavilyApiKey}`,
        // url: 'https://mcp.byted.org/api/node_fc/tavily',
        timeout: 60,
        header: {
          'x-tavily-api-key': options.tavilyApiKey,
        },
      },
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Google,
        description: 'google search tool',
        url: process.env.GOOGLE_MCP_URL,
        headers: {
          'x-serper-api-key': options.googleApiKey,
        },
      },
    ]);
  }

  async init() {
    await this.client.init();

    const start = Date.now();

    const tools = await this.client.listTools();

    console.log(
      '[tools]: ',
      tools.map((t) => t.name),
      'time: ',
      Date.now() - start,
    );
  }
}
