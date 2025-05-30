/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';
import { createNavigationTools, createContentTools, createStatusTools } from '../tools';

/**
 * GUIAgentOnlyStrategy - Implements the 'gui-agent-only' browser control mode
 *
 * This strategy exclusively uses the GUI Agent for browser control, with custom
 * implementations for essential browser functions like navigation, without depending
 * on the MCP Browser server.
 */
export class GUIAgentOnlyStrategy extends AbstractBrowserControlStrategy {
  /**
   * Register GUI Agent tool and self-implemented browser tools
   */
  async registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]> {
    // Register GUI Agent tool if available
    if (this.browserGUIAgent) {
      const guiAgentTool = this.browserGUIAgent.getToolDefinition();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);

      // Register custom browser tools that don't rely on MCP Browser server
      this.registerCustomBrowserTools(registerToolFn);
    }

    return Array.from(this.registeredTools);
  }

  /**
   * Register custom browser tools implemented within the GUI Agent
   */
  private registerCustomBrowserTools(registerToolFn: (tool: ToolDefinition) => void): void {
    if (!this.browserGUIAgent) {
      this.logger.warn('GUI Agent not initialized, cannot register custom browser tools');
      return;
    }

    // Use centralized tool factories
    const navigationTools = createNavigationTools(this.logger, this.browserGUIAgent);
    const contentTools = createContentTools(this.logger, this.browserGUIAgent);
    const statusTools = createStatusTools(this.logger, this.browserGUIAgent);

    // Register all tools
    [...navigationTools, ...contentTools, ...statusTools].forEach((tool) => {
      registerToolFn(tool);
      this.registeredTools.add(tool.name);
    });

    this.logger.info(`Registered ${this.registeredTools.size} custom browser tools`);
  }
}
