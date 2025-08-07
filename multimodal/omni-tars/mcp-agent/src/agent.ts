/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentBuilder, ComposableAgent } from '@omni-tars/core';
import { McpAgentPlugin } from './McpAgentPlugin';
import { McpManager } from './tools/mcp';

const mcpPlugin = new McpAgentPlugin({
  mcpServers: [
    {
      type: 'streamable-http',
      name: McpManager.McpClientType.Tavily,
      description: 'tavily search tool',
      url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.GOOGLE_API_KEY}`,
      timeout: 60,
      header: {
        'x-tavily-api-key': process.env.TAVILY_API_KEY,
      },
    },
    {
      type: 'streamable-http',
      name: McpManager.McpClientType.Google,
      description: 'google search tool',
      url: process.env.GOOGLE_MCP_URL,
      headers: {
        'x-serper-api-key': process.env.GOOGLE_API_KEY,
      },
    },
  ],
});

// const agent = AgentBuilder.create().withName('Seed MCP Agent').addPlugin(mcpPlugin).build();
const agent = new ComposableAgent({
  name: 'Seed MCP Agent',
  plugins: [mcpPlugin],
});

export { agent, mcpPlugin };
