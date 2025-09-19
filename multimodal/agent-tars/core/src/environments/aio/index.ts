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
   */
  async initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: AgentEventStream.Processor,
  ): Promise<void> {
    this.logger.info('🌐 Initializing AgentTARS in AIO Sandbox mode');
    this.logger.info(`🔗 AIO Sandbox endpoint: ${this.options.aioSandbox}`);
    this.logger.info('✅ AIO Sandbox initialization complete');
  }

  /**
   * Handle agent loop start
   */
  async onEachAgentLoopStart(
    sessionId: string,
    eventStream: AgentEventStream.Processor,
    isReplaySnapshot: boolean,
  ): Promise<void> {
    this.logger.debug('⏭️ Skipping local browser operations in AIO mode');
  }

  /**
   * Get browser control information
   */
  getBrowserControlInfo(): { mode: string; tools: string[] } {
    return {
      mode: 'aio-sandbox',
      tools: [],
    };
  }

  /**
   * Get MCP server registry configuration
   */
  getMCPServerRegistry(): MCPServerRegistry {
    return {
      aio: {
        type: 'streamable-http',
        url: `${this.options.aioSandbox}/mcp`,
      },
      ...(this.options.mcpServers || {}),
    };
  }
}
