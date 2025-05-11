/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPClient as V2Client } from '@agent-infra/mcp-client';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IMCPClient, MCPClientResult, MCPServerConfig } from './mcp-types';

/**
 * Implementation of IMCPClient using @agent-infra/mcp-client
 */
export class MCPClientV2 implements IMCPClient {
  private v2Client: V2Client;
  private serverName: string;
  private tools: Tool[] = [];
  private isInitialized = false;

  constructor(serverName: string, config: MCPServerConfig) {
    this.serverName = serverName;

    // Create the v2 client with appropriate configuration
    this.v2Client = new V2Client(
      [
        {
          name: serverName,
          ...this.convertConfigToV2Format(config),
          status: 'activate',
        },
      ],
      { isDebug: false },
    );
  }

  /**
   * Convert v1 server config format to v2 format
   */
  private convertConfigToV2Format(config: MCPServerConfig) {
    const v2Config: MCPServerConfig = {};

    if (config.command) {
      v2Config.command = config.command;
    }

    if (config.args) {
      v2Config.args = config.args;
    }

    if (config.env) {
      v2Config.env = config.env;
    }

    if (config.url) {
      v2Config.url = config.url;
      v2Config.type = 'sse'; // Default to SSE for URL-based servers
    }

    return v2Config;
  }

  async initialize(): Promise<Tool[]> {
    if (this.isInitialized) {
      return this.tools;
    }

    try {
      await this.v2Client.init();
      this.tools = await this.v2Client.listTools(this.serverName as string);
      this.isInitialized = true;
      return this.tools;
    } catch (error) {
      console.error(`Error initializing v2 MCP client for ${this.serverName}:`, error);
      throw error;
    }
  }

  async callTool(toolName: string, args: unknown): Promise<MCPClientResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const result = await this.v2Client.callTool({
        client: this.serverName as string,
        name: toolName,
        args,
      });

      // Convert the v2 result format to v1 format
      return { content: result.content };
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      return {
        content: `Error: Failed to execute tool ${toolName}: ${error}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.v2Client.cleanup();
      this.isInitialized = false;
      this.tools = [];
    }
  }

  getTools(): Tool[] {
    return [...this.tools];
  }
}
