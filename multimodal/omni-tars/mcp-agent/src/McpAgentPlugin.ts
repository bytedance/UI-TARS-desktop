/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, MCP_ENVIRONMENT } from '@omni-tars/core';
import { Tool, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { McpManager } from './tools/mcp';
import { MCPServer } from '@agent-infra/mcp-client';

export interface McpAgentConfig {
  mcpServers: MCPServer[];
}

/**
 * MCP Agent Plugin - handles MCP_ENVIRONMENT and provides search/link reading capabilities
 */
export class McpAgentPlugin implements AgentPlugin {
  readonly name = 'mcp-agent-plugin';
  readonly environmentSection = MCP_ENVIRONMENT;

  private mcpManager: McpManager;
  private tools: Tool[] = [];

  constructor(config: McpAgentConfig) {
    this.mcpManager = new McpManager({
      mcpServers: config.mcpServers,
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

  getTools(): Tool[] {
    return this.tools;
  }

  onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    // MCP-specific loop start handling if needed
  }

  onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    // MCP-specific loop start handling if needed
  }

  onEachAgentLoopStart?(): void | Promise<void> {
    // MCP-specific loop start handling if needed
  }

  onAgentLoopEnd?(): void | Promise<void> {
    // MCP-specific loop end handling if needed
  }
}
