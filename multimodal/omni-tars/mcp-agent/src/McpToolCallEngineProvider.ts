/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';
import { McpToolCallEngine } from './McpToolCallEngine';

/**
 * MCP Tool Call Engine Provider
 * Provides the SeedMCPAgentToolCallEngine for MCP-related tasks
 */
export class McpToolCallEngineProvider extends ToolCallEngineProvider<McpToolCallEngine> {
  readonly name = 'mcp-tool-call-engine';
  readonly priority = 100; // High priority for MCP tasks
  readonly description =
    'Tool call engine optimized for MCP (Model Context Protocol) tasks with custom prompt parsing';

  protected createEngine(): McpToolCallEngine {
    return new McpToolCallEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    // Check if any of the available tools are MCP-related
    if (context.toolCalls) {
      const mcpToolNames = ['Search', 'LinkReader'];
      const hasMcpTools = context?.toolCalls?.some((tool) =>
        mcpToolNames.some((mcpName) =>
          tool.function.name.toLowerCase().includes(mcpName.toLowerCase()),
        ),
      );

      return !!hasMcpTools;
    }

    // Fallback: Check if the latest model output contains <mcp_env></mcp_env> tags
    if (context.latestAssistantMessage) {
      const hasMcpEnvTags = context.latestAssistantMessage.includes('<mcp_env>');
      if (hasMcpEnvTags) {
        return true;
      }
    }

    return false;
  }
}
