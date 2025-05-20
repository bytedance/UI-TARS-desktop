/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPClient as V2Client } from '@agent-infra/mcp-client';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { IMCPClient, MCPClientResult, MCPServerConfig } from './mcp-types';
import type { Logger } from '@agent-infra/logger';

/**
 * Implementation of IMCPClient using @agent-infra/mcp-client
 */
export class MCPClientV2 implements IMCPClient {
  private v2Client: V2Client;
  private serverName: string;
  private tools: Tool[] = [];
  private isInitialized = false;

  constructor(
    serverName: string,
    config: MCPServerConfig,
    private logger: Logger,
  ) {
    this.serverName = serverName;

    // Create the v2 client with appropriate configuration
    this.v2Client = new V2Client(
      [
        {
          name: serverName,
          ...config,
          status: 'activate',
        },
      ],
      { isDebug: false },
    );
  }

  async initialize(): Promise<Tool[]> {
    if (this.isInitialized) {
      return this.tools;
    }

    try {
      this.logger.info(`Initializing MCP client v2 for ${this.serverName}`);
      await this.v2Client.init();
      this.tools = await this.v2Client.listTools(this.serverName as string);
      this.isInitialized = true;
      this.logger.success(
        `MCP client v2 initialized successfully for ${this.serverName}, found ${this.tools.length} tools`,
      );
      return this.tools;
    } catch (error) {
      this.logger.error(`Error initializing v2 MCP client for ${this.serverName}:`, error);
      throw error;
    }
  }

  async callTool(toolName: string, args: unknown): Promise<MCPClientResult> {
    if (!this.isInitialized) {
      this.logger.info(`Client not initialized, initializing before tool call: ${toolName}`);
      await this.initialize();
    }

    try {
      this.logger.info(`Calling tool ${toolName} with client ${this.serverName}`);
      const result = await this.v2Client.callTool({
        client: this.serverName as string,
        name: toolName,
        args,
      });

      // Convert the v2 result format to v1 format
      return { content: result.content };
    } catch (error) {
      this.logger.error(`Error calling MCP tool ${toolName}:`, error);
      return {
        content: `Error: Failed to execute tool ${toolName}: ${error}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.isInitialized) {
      this.logger.info(`Closing MCP client v2 for ${this.serverName}`);
      await this.v2Client.cleanup();
      this.isInitialized = false;
      this.tools = [];
      this.logger.success(`MCP client v2 closed successfully for ${this.serverName}`);
    }
  }

  getTools(): Tool[] {
    return [...this.tools];
  }
}
