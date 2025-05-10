// /packages/agent-infra/agent/core/src/mcp/mcp-agent.ts
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent } from '../agent';
import { AgentOptions, ToolDefinition } from '../types';
import { MCPClient, MCPServerRegistry } from './mcp-client';
import { MCPToolAdapter } from './mcp-tool-adapter';

export interface MCPAgentOptions extends AgentOptions {
  mcpServers: MCPServerRegistry;
}

export type { MCPServerConfig, MCPServerRegistry } from './mcp-client';

export class MCPAgent extends Agent {
  private mcpClients: Map<string, MCPClient> = new Map();
  private mcpServerConfig: MCPServerRegistry;

  constructor(options: MCPAgentOptions) {
    // Create a new agent with the base options
    super(options);

    this.mcpServerConfig = options.mcpServers;
  }

  /**
   * Initialize the MCP Agent and connect to MCP servers
   */
  async initialize(): Promise<void> {
    // Initialize MCP clients and register tools
    for (const [serverName, config] of Object.entries(this.mcpServerConfig)) {
      try {
        console.log(`🔌 Connecting to MCP server: ${serverName}`);
        const mcpClient = new MCPClient(serverName, config);

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

        console.log(
          `✅ Connected to MCP server ${serverName} with ${tools.length} tools`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to connect to MCP server ${serverName}:`,
          error instanceof Error ? error.message : JSON.stringify(error),
        );
        throw new Error(
          `❌ Failed to connect to MCP server ${serverName}: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        );
      }
    }
  }

  /**
   * Clean up resources when done
   */
  async cleanup(): Promise<void> {
    for (const [serverName, client] of this.mcpClients.entries()) {
      try {
        await client.close();
        console.log(`✅ Closed connection to MCP server: ${serverName}`);
      } catch (error) {
        console.error(`❌ Error closing MCP client ${serverName}:`, error);
      }
    }
    this.mcpClients.clear();
  }
}
