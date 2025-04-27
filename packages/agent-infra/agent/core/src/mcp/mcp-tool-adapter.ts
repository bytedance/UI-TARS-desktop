/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool } from '../tool';
import { MCPClient } from './mcp-client';

/**
 * Adapts MCP tools to our local Tool format
 */
export class MCPToolAdapter {
  constructor(
    private mcpClient: MCPClient,
    private serverName: string,
  ) {}

  /**
   * Create Tool instances from MCP tools
   */
  createTools(): Tool<any>[] {
    const mcpTools = this.mcpClient.getTools();

    return mcpTools.map((mcpTool) => {
      // Directly use the MCP tool's input schema (JSON Schema)
      return new Tool({
        id: `${this.serverName}__${mcpTool.name}`,
        description: `[${this.serverName}] ${mcpTool.description}`,
        // Use JSON schema directly without converting
        parameters: mcpTool.inputSchema || { type: 'object', properties: {} },
        function: async (args: any) => {
          const result = await this.mcpClient.callTool(mcpTool.name, args);
          return result.content;
        },
      });
    });
  }
}
