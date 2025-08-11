/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, MCP_ENVIRONMENT } from '@omni-tars/core';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { McpManager } from './tools/mcp';
import { MCPServer } from '@agent-infra/mcp-client';

export interface McpAgentPluginOption {
  mcpServers: MCPServer[];
}

/**
 * MCP Agent Plugin - handles MCP_ENVIRONMENT and provides search/link reading capabilities
 */
export class McpAgentPlugin extends AgentPlugin {
  readonly name = 'mcp-agent-plugin';
  readonly environmentSection = MCP_ENVIRONMENT;

  private mcpManager: McpManager;

  constructor(option: McpAgentPluginOption) {
    super();
    this.mcpManager = new McpManager({
      mcpServers: option.mcpServers,
    });
  }

  async initialize(): Promise<void> {
    await this.mcpManager.init();

    // Initialize tools
    this.tools = [
      new SearchToolProvider(this.mcpManager).getTool(),
      new LinkReaderToolProvider(this.mcpManager).getTool(),
    ];
  }

  async onEachAgentLoopStart(): Promise<void> {
    // MCP-specific loop start handling if needed
    // const eventStream = this.agent.getEventStream();
    // const systemEvent = eventStream.createEvent('system', {
    //   level: 'info',
    //   message: 'MCP Agent Plugin - Loop Start',
    //   details: { pluginName: this.name },
    // });
    // eventStream.sendEvent(systemEvent);
  }
}
