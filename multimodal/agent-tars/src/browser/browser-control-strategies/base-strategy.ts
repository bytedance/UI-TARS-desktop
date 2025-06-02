/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, JSONSchema7, ToolDefinition } from '@multimodal/mcp-agent';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { BrowserGUIAgent } from '../browser-gui-agent';

/**
 * BrowserControlStrategy - Interface for browser control strategies
 *
 * Defines the contract that all browser control strategies must implement
 */
export interface BrowserControlStrategy {
  /**
   * Set the MCP Browser client for DOM-based operations
   * @param client MCP client for browser operations
   */
  setBrowserClient(client: Client): void;

  /**
   * Set the browser GUI Agent for vision-based operations
   * @param  browserGUIAgent GUI Agent instance
   */
  setBrowserGUIAgent(browserGUIAgent: BrowserGUIAgent): void;

  /**
   * Register browser control tools based on the strategy
   * @param registerToolFn Function to register a tool with the agent
   * @returns Array of registered tool names
   */
  registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]>;

  /**
   * Get the name of the strategy for logging purposes
   */
  getStrategyName(): string;
}

/**
 * AbstractBrowserControlStrategy - Base implementation for browser control strategies
 *
 * Provides common functionality and state management for all strategies
 */
export abstract class AbstractBrowserControlStrategy implements BrowserControlStrategy {
  protected browserClient?: Client;
  protected browserGUIAgent?: BrowserGUIAgent;
  protected logger: ConsoleLogger;
  protected registeredTools: Set<string> = new Set();

  constructor(logger: ConsoleLogger) {
    this.logger = logger.spawn(this.constructor.name);
  }

  /**
   * Set the MCP Browser client
   */
  setBrowserClient(client: Client): void {
    this.browserClient = client;
  }

  /**
   * Set the GUI Agent
   */
  setBrowserGUIAgent(browserGUIAgent: BrowserGUIAgent): void {
    this.browserGUIAgent = browserGUIAgent;
  }

  /**
   * Register browser control tools
   * Each strategy must implement this method
   */
  abstract registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]>;

  /**
   * Get the name of the strategy for logging purposes
   */
  getStrategyName(): string {
    return this.constructor.name;
  }

  /**
   * Register selected MCP Browser tools
   * Helper method for strategies that use MCP Browser
   */
  protected async registerMCPBrowserTools(
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
          this.logger.debug(`Registered browser tool: ${tool.name}`);
        }
      }

      this.logger.info(`Registered ${this.registeredTools.size} MCP browser tools`);
    } catch (error) {
      this.logger.error(`Failed to register MCP browser tools:`, error);
      throw error;
    }
  }
}
