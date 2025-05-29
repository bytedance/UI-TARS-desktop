/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Tool } from '@multimodal/agent';
import { IMCPClient } from './mcp-types';
import type { JSONSchema7 } from 'json-schema';

/**
 * Adapts MCP tools to our local Tool format
 */
export class MCPToolAdapter {
  constructor(
    private mcpClient: IMCPClient,
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
        id: mcpTool.name,
        description: `[${this.serverName}] ${mcpTool.description}`,
        // Use JSON schema directly without converting
        parameters: (mcpTool.inputSchema || {
          type: 'object',
          properties: {},
        }) as JSONSchema7,
        function: async (args: any) => {
          const result = await this.mcpClient.callTool(mcpTool.name, args);
          return result.content;
        },
      });
    });
  }
}
