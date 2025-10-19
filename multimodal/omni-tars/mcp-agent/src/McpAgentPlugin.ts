/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, MCP_ENVIRONMENT } from '@omni-tars/core';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { McpManager } from './tools/mcp';
import { MCPServer } from '@agent-infra/mcp-client';

// MCP Control Tools
import { McpListServersToolProvider } from './tools/McpListServers';
import { McpAddServerToolProvider } from './tools/McpAddServer';
import { McpDeleteServerToolProvider } from './tools/McpDeleteServer';
import { McpUpdateServerToolProvider } from './tools/McpUpdateServer';
import { McpActivateServerToolProvider } from './tools/McpActivateServer';
import { McpDeactivateServerToolProvider } from './tools/McpDeactivateServer';
import { McpSetServerActiveToolProvider } from './tools/McpSetServerActive';
import { McpListToolsToolProvider } from './tools/McpListTools';
import { McpCallToolToolProvider } from './tools/McpCallTool';
import { McpCheckServerStatusToolProvider } from './tools/McpCheckServerStatus';
import { McpCleanupServersToolProvider } from './tools/McpCleanupServers';
import { McpCacheClearToolProvider } from './tools/McpCacheClear';

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
      mcpServers: option.mcpServers.filter((s) => s.enable),
    });
  }

  async initialize(): Promise<void> {
    //FIXME:Temporarily remove await to speed up the agent initialization process; the logic of mcpManager.getClient() needs to be added later
    this.mcpManager.init();

   // Initialize tools
    this.tools = [
      new SearchToolProvider(this.mcpManager).getTool(),
      new LinkReaderToolProvider(this.mcpManager).getTool(),
      new McpListServersToolProvider(this.mcpManager).getTool(),
      new McpAddServerToolProvider(this.mcpManager).getTool(),
      new McpDeleteServerToolProvider(this.mcpManager).getTool(),
      new McpUpdateServerToolProvider(this.mcpManager).getTool(),
      new McpActivateServerToolProvider(this.mcpManager).getTool(),
      new McpDeactivateServerToolProvider(this.mcpManager).getTool(),
      new McpSetServerActiveToolProvider(this.mcpManager).getTool(),
      new McpListToolsToolProvider(this.mcpManager).getTool(),
      new McpCallToolToolProvider(this.mcpManager).getTool(),
      new McpCheckServerStatusToolProvider(this.mcpManager).getTool(),
      new McpCleanupServersToolProvider(this.mcpManager).getTool(),
      new McpCacheClearToolProvider(this.mcpManager).getTool(),
    ];
    console.log(`[McpAgentPlugin] Loaded ${this.tools.length} 'MCP' tools.`);
  }
}
