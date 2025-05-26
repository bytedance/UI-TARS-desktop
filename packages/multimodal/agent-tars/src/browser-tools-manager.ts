/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { GUIAgent } from './gui-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { JSONSchema7 } from 'json-schema';

/**
 * BrowserToolsManager - Controls the registration of browser tools based on selected strategy
 *
 * This manager implements a Strategy pattern for browser control:
 * - Encapsulates each browser control strategy (default, browser-use-only, gui-agent)
 * - Dynamically registers the appropriate tools based on the selected strategy
 * - Ensures proper integration between GUI Agent and MCP Browser Server tools
 */
export class BrowserToolsManager {
  private logger: ConsoleLogger;
  private browserClient?: Client;
  private guiAgent?: GUIAgent;
  private registeredTools: Set<string> = new Set();

  constructor(
    logger: ConsoleLogger,
    private strategy: 'default' | 'browser-use-only' | 'gui-agent' = 'default',
  ) {
    this.logger = logger.spawn('BrowserToolsManager');
    this.logger.info(`Initialized with strategy: ${strategy}`);
  }

  /**
   * Set the MCP Browser client for DOM-based operations
   */
  setBrowserClient(client: Client): void {
    this.browserClient = client;
  }

  /**
   * Set the GUI Agent for vision-based operations
   */
  setGUIAgent(guiAgent: GUIAgent): void {
    this.guiAgent = guiAgent;
  }

  /**
   * Register all browser tools according to the selected strategy
   * @param registerToolFn Function to register a tool with the agent
   * @returns Array of registered tool names
   */
  async registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]> {
    // Clear previously registered tools tracking
    this.registeredTools.clear();

    if (
      !this.browserClient &&
      (this.strategy === 'default' || this.strategy === 'browser-use-only')
    ) {
      this.logger.warn('Browser client not set but required for current strategy');
      return [];
    }

    if (!this.guiAgent && (this.strategy === 'default' || this.strategy === 'gui-agent')) {
      this.logger.warn('GUI Agent not set but required for current strategy');
      return [];
    }

    switch (this.strategy) {
      case 'default':
        await this.registerDefaultTools(registerToolFn);
        break;
      case 'browser-use-only':
        await this.registerBrowserUseOnlyTools(registerToolFn);
        break;
      case 'gui-agent':
        await this.registerGUIAgentTools(registerToolFn);
        break;
    }

    return Array.from(this.registeredTools);
  }

  /**
   * Register tools for the default strategy (GUI Agent + complementary tools)
   */
  private async registerDefaultTools(
    registerToolFn: (tool: ToolDefinition) => void,
  ): Promise<void> {
    // Then register complementary MCP Browser tools
    if (this.browserClient) {
      const complementaryTools = [
        'browser_navigate',
        'browser_get_markdown',
        'browser_back',
        'browser_forward',
        'browser_refresh',
        'browser_get_url',
        'browser_get_title',
        'browser_screenshot',
      ];

      await this.registerSelectedMCPBrowserTools(registerToolFn, complementaryTools);
    }

    // Register GUI Agent tool at the end
    if (this.guiAgent) {
      const guiAgentTool = this.guiAgent.getToolDefinition();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);
    }
  }

  /**
   * Register tools for browser-use-only strategy (pure DOM-based)
   */
  private async registerBrowserUseOnlyTools(
    registerToolFn: (tool: ToolDefinition) => void,
  ): Promise<void> {
    if (!this.browserClient) return;

    const browserUseOnlyTools = [
      'browser_navigate',
      'browser_get_markdown', // Only keep the most useful content tool
      'browser_back',
      'browser_forward',
      'browser_refresh',
      'browser_click',
      'browser_type',
      'browser_press',
      'browser_hover',
      'browser_drag',
      'browser_scroll',
      'browser_get_url',
      'browser_get_title',
      'browser_get_elements',
      'browser_screenshot',
    ];

    await this.registerSelectedMCPBrowserTools(registerToolFn, browserUseOnlyTools);
  }

  /**
   * Register tools for gui-agent strategy (pure vision-based with navigation)
   */
  private async registerGUIAgentTools(
    registerToolFn: (tool: ToolDefinition) => void,
  ): Promise<void> {
    // Register GUI Agent tool
    if (this.guiAgent) {
      const guiAgentTool = this.guiAgent.getToolDefinition();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);
    }

    // Register the navigation related tools from MCP Browser
    if (this.browserClient) {
      await this.registerSelectedMCPBrowserTools(registerToolFn, [
        'browser_navigate',
        'browser_back',
        'browser_forward',
        'browser_refresh',
      ]);
    }
  }

  /**
   * Helper method to register selected tools from MCP Browser Server
   */
  private async registerSelectedMCPBrowserTools(
    registerToolFn: (tool: ToolDefinition) => void,
    toolNames: string[],
  ): Promise<void> {
    if (!this.browserClient) return;

    try {
      // Get all available tools from browser client
      const tools = await this.browserClient.listTools();

      if (!tools || !Array.isArray(tools.tools)) {
        this.logger.warn('No tools returned from browser client');
        return;
      }

      // Filter tools by name and register them
      for (const tool of tools.tools) {
        if (toolNames.includes(tool.name)) {
          const toolDefinition: ToolDefinition = {
            name: tool.name,
            description: `[browser] ${tool.description}`,
            schema: (tool.inputSchema || { type: 'object', properties: {} }) as JSONSchema7,
            function: async (args: Record<string, unknown>) => {
              try {
                const result = await this.browserClient!.callTool({
                  name: tool.name,
                  arguments: args,
                });
                return result.content;
              } catch (error) {
                this.logger.error(`Error executing tool '${tool.name}':`, error);
                throw error;
              }
            },
          };

          registerToolFn(toolDefinition);
          this.registeredTools.add(tool.name);
        }
      }

      this.logger.info(`Registered ${this.registeredTools.size} MCP browser tools`);
    } catch (error) {
      this.logger.error(`Failed to register MCP browser tools:`, error);
      throw error;
    }
  }
}
