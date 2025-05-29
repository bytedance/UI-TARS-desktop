/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent, ToolDefinition } from '@multimodal/agent';
import { MCPAgentOptions, IMCPClient, MCPServerRegistry } from './mcp-types';
import { MCPClient } from './mcp-client';
import { MCPClientV2 } from './mcp-client-v2';
import { MCPToolAdapter } from './mcp-tool-adapter';

export class MCPAgent extends Agent {
  private mcpClients: Map<string, IMCPClient> = new Map();
  private mcpServerConfig: MCPServerRegistry;
  private clientVersion: 'v1' | 'v2';

  constructor(options: MCPAgentOptions) {
    // Create a new agent with the base options
    super(options);

    this.mcpServerConfig = options.mcpServers;
    this.clientVersion = options.mcpClientVersion ?? 'v2';
  }

  /**
   * Initialize the MCP Agent and connect to MCP servers
   */
  async initialize(): Promise<void> {
    // Initialize MCP clients and register tools
    for (const [serverName, config] of Object.entries(this.mcpServerConfig)) {
      try {
        this.logger.info(`🔌 Connecting to MCP server: ${serverName}`);

        // Create appropriate client based on clientVersion
        let mcpClient: IMCPClient;

        if (this.clientVersion === 'v2') {
          mcpClient = new MCPClientV2(serverName, config, this.logger);
        } else {
          // Default to v1
          mcpClient = new MCPClient(serverName, config, this.logger);
        }

        // Initialize the client and get tools
        await mcpClient.initialize();

        // Store the client for later use
        this.mcpClients.set(serverName, mcpClient);

        // Create and register tool adapters
        const toolAdapter = new MCPToolAdapter(mcpClient, serverName);
        const tools = toolAdapter.createTools();

        // Register each tool with the agent
        for (const tool of tools) {
          this.registerTool(tool as unknown as ToolDefinition);
        }

        this.logger.success(`✅ Connected to MCP server ${serverName} with ${tools.length} tools`);
      } catch (error) {
        this.logger.error(
          `❌ Failed to connect to MCP server ${serverName}: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
        throw new Error(
          `❌ Failed to connect to MCP server ${serverName}: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
      }
    }

    // Call it to update the initialization state.
    super.initialize();
  }

  /**
   * Clean up resources when done
   */
  async cleanup(): Promise<void> {
    for (const [serverName, client] of this.mcpClients.entries()) {
      try {
        await client.close();
        this.logger.info(`✅ Closed connection to MCP server: ${serverName}`);
      } catch (error) {
        this.logger.error(`❌ Error closing MCP client ${serverName}: ${error}`);
      }
    }
    this.mcpClients.clear();
  }
}
