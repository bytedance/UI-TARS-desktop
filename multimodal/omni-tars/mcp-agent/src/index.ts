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

export const mcpPlugin = new McpAgentPlugin({
  mcpServers: [
    {
      type: 'streamable-http',
      name: McpManager.McpClientType.Tavily,
      description: 'tavily search tool',
      url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.TAVILY_API_KEY}`,
      timeout: 60,
      enable: !!process.env.TAVILY_API_KEY,
    },
    {
      type: 'streamable-http',
      name: McpManager.McpClientType.Google,
      description: 'google search tool',
      url: process.env.GOOGLE_MCP_URL,
      headers: {
        'x-serper-api-key': process.env.GOOGLE_API_KEY,
      },
      enable: true,
    },
    {
      type: 'streamable-http',
      name: McpManager.McpClientType.LinkReader,
      description: 'Crawl, parse and summarize for web pages',
      url: process.env.LINKREADER_MCP_URL,
      timeout: 60,
      enable: !!process.env.LINKREADER_MCP_URL,
    },
  ],
});

export default class McpAgent extends ComposableAgent {
  static label: 'Seed MCP Agent';
  constructor(options: AgentOptions) {
    super({
      ...options,
      plugins: [mcpPlugin],
      toolCallEngine: McpToolCallEngine,
    });
  }
}
