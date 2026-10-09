/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Agent, Tool } from '@tarko/agent';
import type { JSONSchema7 } from '@tarko/agent';
import { MCPAgentOptions, IMCPClient, MCPServerRegistry } from './mcp-types';
import { MCPClientV2 } from './mcp-client-v2';
import { filterItems } from '@tarko/shared-utils';

export class MCPAgent<T extends MCPAgentOptions = MCPAgentOptions> extends Agent<T> {
  static label = '@tarko/mcp-agent';
  private mcpClients: Map<string, IMCPClient> = new Map();
  private mcpServerConfig: MCPServerRegistry;

  constructor(options: MCPAgentOptions) {
    // Create a new agent with the base options
    super(options);

    this.mcpServerConfig = options.mcpServers ?? {};
  }

  private filterMCPServers(
    mcpServerConfig: MCPServerRegistry,
    filterOptions?: MCPAgentOptions['mcpServer'],
  ): MCPServerRegistry {
    if (!filterOptions || (!filterOptions.include && !filterOptions.exclude)) {
      return mcpServerConfig;
    }

    // Convert server registry to filterable items
    const serverItems = Object.entries(mcpServerConfig).map(([name, config]) => ({
      name,
      config,
    }));

    // Apply filtering
    const filteredServers = filterItems(serverItems, filterOptions, 'MCP servers');

    // Convert back to registry format
    const filteredRegistry: MCPServerRegistry = {};
    filteredServers.forEach(({ name, config }) => {
      filteredRegistry[name] = config;
    });

    return filteredRegistry;
  }

  async initialize(): Promise<void> {
    // Apply MCP server filtering
    const filteredMcpServerConfig = this.filterMCPServers(
      this.mcpServerConfig,
      this.options.mcpServer,
    );

    // Initialize MCP clients and register tools
    for (const [serverName, config] of Object.entries(filteredMcpServerConfig)) {
      this.logger.info(`🔌 Connecting to MCP server: ${serverName}`);

      const defaultTimeout = this.options.defaultConnectionTimeout ?? 60;
      let mcpClient: MCPClientV2 | undefined;

      try {
        mcpClient = new MCPClientV2(serverName, config, this.logger, defaultTimeout);
        await mcpClient.initialize();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const message = `Failed to initialize MCP server "${serverName}": ${errorMessage}`;

        this.logger.error(`❌ ${message}`);

        const eventStream = this.getEventStream();
        eventStream.sendEvent(
          eventStream.createEvent('system', {
            level: 'error',
            message,
            details: {
              source: 'mcp',
              phase: 'initialization',
              serverName,
            },
          }),
        );

        if (mcpClient) {
          try {
            await mcpClient.close();
          } catch (cleanupError) {
            this.logger.error(
              `Failed to clean up MCP client ${serverName}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
            );
          }
        }

        continue;
      }

      // Store the client for later use
      this.mcpClients.set(serverName, mcpClient);

      // Create and register tools directly
      const mcpTools = mcpClient.getTools();
      for (const mcpTool of mcpTools) {
        const tool = new Tool({
          id: mcpTool.name,
          description: `[${serverName}] ${mcpTool.description}`,
          parameters: (mcpTool.inputSchema || {
            type: 'object',
            properties: {},
          }) as JSONSchema7,
          function: async (args: Record<string, unknown>) => {
            return await mcpClient.callTool(mcpTool.name, args);
          },
        });
        this.registerTool(tool as unknown as Tool);
      }

      const toolCount = mcpTools.length;

      this.logger.success(`✅ Connected to MCP server ${serverName} with ${toolCount} tools`);
    }

    super.initialize();
  }

  async cleanup(): Promise<void> {
    for (const [serverName, client] of Array.from(this.mcpClients.entries())) {
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
