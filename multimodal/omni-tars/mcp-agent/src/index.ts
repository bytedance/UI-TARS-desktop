/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComposableAgent } from '@omni-tars/core';
import { McpAgentPlugin } from './McpAgentPlugin';
import { McpManager } from './tools/mcp';
import { McpToolCallEngine } from './McpToolCallEngine';
import { AgentOptions } from '@tarko/agent';
export { McpAgentPlugin } from './McpAgentPlugin';
export { McpToolCallEngineProvider } from './McpToolCallEngineProvider';

export type MCPTarsExtraOption = {
  googleMcpUrl: string;
  googleApiKey: string;
  tavilyApiKey?: string;
  linkReaderMcpUrl?: string;
  linkReaderAK?: string;
};

type MCPTarsOption = AgentOptions & MCPTarsExtraOption;

export const mcpPluginBuilder = (option: MCPTarsExtraOption) => {
  return new McpAgentPlugin({
    mcpServers: [
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Tavily,
        description: 'tavily search tool',
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${option.tavilyApiKey}`,
        timeout: 60,
        enable: !!option.tavilyApiKey,
      },
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Google,
        description: 'google search tool',
        url: option.googleMcpUrl,
        headers: {
          'x-serper-api-key': option.googleApiKey,
        },
        enable: true,
      },
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.LinkReader,
        description: 'Crawl, parse and summarize for web pages',
        url: option.linkReaderMcpUrl,
        headers: {
          'x-text-browser-ak': option.linkReaderAK,
          'x-text-browser-traffic-id': 'edge_agent_research',
          'x-text-browser-traffic-group': 'Seed_Edge',
        },
        timeout: 60,
        enable: !!option.linkReaderMcpUrl,
      },
    ],
  });
};

export default class McpAgent extends ComposableAgent {
  static label: 'Seed MCP Agent';
  constructor(options: MCPTarsOption) {
    const { tavilyApiKey, googleApiKey, googleMcpUrl, linkReaderMcpUrl, ...restOptions } = options;

    super({
      ...restOptions,
      plugins: [mcpPluginBuilder({ tavilyApiKey, googleMcpUrl, googleApiKey, linkReaderMcpUrl })],
      toolCallEngine: McpToolCallEngine,
    });
  }
}
