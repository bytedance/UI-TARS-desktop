/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger, MCPServerRegistry, AgentEventStream } from '@tarko/mcp-agent';
import { AgentTARSOptions, BuiltInMCPServers } from '../../types';

/**
 * Base environment class for AgentTARS
 * Provides common interface and default implementations for environment operations
 */
export abstract class AgentTARSBaseEnvironment {
  protected logger: ConsoleLogger;
  protected options: AgentTARSOptions;
  protected workspace: string;

  constructor(options: AgentTARSOptions, workspace: string, logger: ConsoleLogger) {
    this.options = options;
    this.workspace = workspace;
    this.logger = logger;
  }

  /**
   * Initialize the environment and all its components
   */
  abstract initialize(
    registerToolFn: (tool: Tool) => void,
    eventStream?: AgentEventStream.Processor,
  ): Promise<void>;

  /**
   * Handle agent loop start operations
   */
  abstract onEachAgentLoopStart(
    sessionId: string,
    eventStream: AgentEventStream.Processor,
    isReplaySnapshot: boolean,
  ): Promise<void>;

  /**
   * Handle tool call preprocessing
   */
  async onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
    isReplaySnapshot?: boolean,
  ): Promise<any> {
    return args;
  }

  /**
   * Handle post-tool call processing
   */
  async onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
    browserState: any,
  ): Promise<any> {
    return result;
  }

  /**
   * Handle session disposal
   */
  async onDispose(): Promise<void> {
    // No cleanup needed by default
  }

  /**
   * Get browser control information
   */
  getBrowserControlInfo(): { mode: string; tools: string[] } {
    return {
      mode: this.options.browser?.control || 'default',
      tools: [],
    };
  }

  /**
   * Get the browser manager instance
   */
  getBrowserManager(): any {
    return undefined;
  }

  /**
   * Get MCP servers for cleanup
   */
  getMCPServers(): BuiltInMCPServers {
    return {};
  }

  /**
   * Get MCP server registry configuration
   */
  abstract getMCPServerRegistry(): MCPServerRegistry;
}
