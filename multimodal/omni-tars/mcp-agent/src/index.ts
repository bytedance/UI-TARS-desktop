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

type MCPTarsExtraOption = {
  tavilyApiKey: string;
  googleMcpUrl: string;
  googleApiKey: string;
  linkReaderMcpUrl?: string;
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
