/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { BrowserGUIAgent } from './browser-gui-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { StrategyFactory } from './browser-control-strategies/strategy-factory';
import { BrowserControlStrategy } from './browser-control-strategies/base-strategy';
import { BrowserControlMode } from '../types';

/**
 * BrowserToolsManager - Controls the registration of browser tools based on selected strategy
 *
 * This manager implements a Strategy pattern for browser control:
 * - Encapsulates each browser control strategy (default, browser-use-only, gui-agent-only)
 * - Dynamically registers the appropriate tools based on the selected strategy
 * - Ensures proper integration between GUI Agent and MCP Browser Server tools
 */
export class BrowserToolsManager {
  private logger: ConsoleLogger;
  private browserClient?: Client;
  private browserGUIAgent?: BrowserGUIAgent;
  private registeredTools: Set<string> = new Set();
  private strategy: BrowserControlStrategy;

  constructor(
    logger: ConsoleLogger,
    private mode: BrowserControlMode = 'mixed',
  ) {
    this.logger = logger.spawn('BrowserToolsManager');
    this.logger.info(`Initialized with mode: ${mode}`);

    // Create strategy using factory
    this.strategy = StrategyFactory.createStrategy(mode, this.logger);
  }

  /**
   * Set the MCP Browser client for DOM-based operations
   */
  setBrowserClient(client: Client): void {
    this.browserClient = client;
    this.strategy.setBrowserClient(client);
  }

  /**
   * Set the GUI Agent for vision-based operations
   */
  setBrowserGUIAgent(guiAgent: BrowserGUIAgent): void {
    this.browserGUIAgent = guiAgent;
    this.strategy.setBrowserGUIAgent(guiAgent);
  }

  /**
   * Register all browser tools according to the selected strategy
   * @param registerToolFn Function to register a tool with the agent
   * @returns Array of registered tool names
   */
  async registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]> {
    // Clear previously registered tools tracking
    this.registeredTools.clear();

    // Check if required components are available for the selected strategy
    if (!this.validateRequiredComponents()) {
      return [];
    }

    // Enhanced logging for browser strategy
    this.logger.info(`🌐 Activating browser control mode: ${this.mode}`);
    this.logger.info(`🔍 Strategy: ${this.strategy.constructor.name}`);

    // Delegate tool registration to the strategy
    const registeredTools = await this.strategy.registerTools(registerToolFn);

    // Track registered tools
    registeredTools.forEach((toolName) => this.registeredTools.add(toolName));

    // Enhanced logging for registered tools
    this.logger.info(`✅ Registered ${registeredTools.length} browser tools:`);
    if (registeredTools.length > 0) {
      registeredTools.forEach((tool) => {
        this.logger.info(`  • ${tool}`);
      });
    }

    return Array.from(this.registeredTools);
  }

  /**
   * Get current browser control mode
   */
  getMode(): BrowserControlMode {
    return this.mode;
  }

  /**
   * Get registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.registeredTools);
  }

  /**
   * Validate that all required components are available for the selected strategy
   */
  private validateRequiredComponents(): boolean {
    if ((this.mode === 'mixed' || this.mode === 'browser-use-only') && !this.browserClient) {
      this.logger.warn('Browser client not set but required for current strategy');
      return false;
    }

    if ((this.mode === 'mixed' || this.mode === 'gui-agent-only') && !this.browserGUIAgent) {
      this.logger.warn('GUI Agent not set but required for current strategy');
      return false;
    }

    return true;
  }
}
