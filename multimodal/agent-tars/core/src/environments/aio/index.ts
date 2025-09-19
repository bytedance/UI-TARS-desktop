/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger, MCPServerRegistry, AgentEventStream } from '@tarko/mcp-agent';
import { AgentTARSOptions } from '../../types';
import { AgentTARSBaseEnvironment } from '../base';

/**
 * AgentTARSAIOEnvironment - Handles AIO Sandbox environment operations
 *
 * This environment disables all local resource operations and relies entirely on AIO Sandbox MCP
 * for all tool functionality when aioSandbox option is provided.
 */
export class AgentTARSAIOEnvironment extends AgentTARSBaseEnvironment {
  constructor(options: AgentTARSOptions, workspace: string, logger: ConsoleLogger) {
    super(options, workspace, logger.spawn('AIOEnvironment'));
  }

  /**
   * Initialize components for AIO Sandbox mode
   * All tools are provided by AIO Sandbox MCP - no local tools initialized
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: AgentEventStream.Processor,
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
    eventStream: AgentEventStream.Processor,
    isReplaySnapshot: boolean,
  ): Promise<void> {
    // Skip all local browser operations in AIO sandbox mode
    this.logger.debug('⏭️ Skipping local browser operations in AIO mode');
  }

  /**
   * Get browser control information for AIO mode
   */
  getBrowserControlInfo(): { mode: string; tools: string[] } {
    return {
      mode: 'aio-sandbox',
      tools: [], // Tools are provided by AIO Sandbox
    };
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
