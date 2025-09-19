/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger, MCPServerRegistry } from '@tarko/mcp-agent';
import { AgentTARSOptions, BuiltInMCPServers, BuiltInMCPServerName } from '../../types';

/**
 * AgentTARSAIOEnvironment - Handles AIO Sandbox environment operations
 *
 * This environment disables all local resource operations and relies entirely on AIO Sandbox MCP
 * for all tool functionality when aioSandbox option is provided.
 */
export class AgentTARSAIOEnvironment {
  private logger: ConsoleLogger;
  private options: AgentTARSOptions;
  private workspace: string;

  // Component instances (none for AIO mode - all tools from MCP)
  private mcpClients: Partial<Record<BuiltInMCPServerName, any>> = {};

  constructor(options: AgentTARSOptions, workspace: string, logger: ConsoleLogger) {
    this.options = options;
    this.workspace = workspace;
    this.logger = logger.spawn('AIOEnvironment');
  }

  /**
   * Initialize components for AIO Sandbox mode
   * All tools are provided by AIO Sandbox MCP - no local tools initialized
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: any,
  ): Promise<void> {
    this.logger.info('🌐 Initializing AgentTARS in AIO Sandbox mode');
    this.logger.info(`🔗 AIO Sandbox endpoint: ${this.options.aioSandbox}`);
    this.logger.info('🚫 All local tools disabled - using AIO Sandbox MCP only');

    this.logger.info('✅ AIO Sandbox initialization complete - all tools via MCP');
  }

  /**
   * Handle agent loop start - no local browser operations in AIO mode
   */
  async onEachAgentLoopStart(
    sessionId: string,
    eventStream: any,
    isReplaySnapshot: boolean,
  ): Promise<void> {
    // Skip all local browser operations in AIO sandbox mode
    this.logger.info('⏭️ Skipping local browser operations in AIO mode');
  }

  /**
   * Handle tool call preprocessing - no local operations in AIO mode
   */
  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
    isReplaySnapshot?: boolean,
  ): Promise<any> {
    // Skip all local tool preprocessing in AIO sandbox mode
    return args;
  }

  /**
   * Handle post-tool call processing - no local operations in AIO mode
   */
  async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
    browserState: any,
  ): Promise<any> {
    // Skip all local post-processing in AIO sandbox mode
    return result;
  }

  /**
   * Handle session disposal - no local cleanup in AIO mode
   */
  async onDispose(): Promise<void> {
    // No local resources to clean up in AIO sandbox mode
    this.logger.info('🧹 No local resources to clean up in AIO mode');
  }

  /**
   * Get browser control information
   */
  getBrowserControlInfo(): { mode: string; tools: string[] } {
    return {
      mode: 'aio-sandbox',
      tools: [], // Tools are provided by AIO Sandbox
    };
  }

  /**
   * Get the browser manager instance
   */
  getBrowserManager(): undefined {
    return undefined; // No local browser manager in AIO mode
  }

  /**
   * Get MCP servers for cleanup
   */
  getMCPServers(): BuiltInMCPServers {
    return {}; // No local MCP servers in AIO mode
  }

  /**
   * Get MCP server registry configuration for AIO mode
   */
  getMCPServerRegistry(): MCPServerRegistry {
    // For AIO sandbox mode, connect to AIO sandbox MCP
    return {
      aio: {
        url: `${this.options.aioSandbox}/mcp`,
      },
      ...(this.options.mcpServers || {}),
    };
  }
}
