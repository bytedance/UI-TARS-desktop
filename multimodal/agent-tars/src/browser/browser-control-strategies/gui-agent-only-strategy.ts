/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '@mcp-agent/core';
import { AbstractBrowserControlStrategy } from './base-strategy';
import {
  createNavigationTools,
  createContentTools,
  createStatusTools,
  createVisualTools,
} from '../tools';

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
  async registerTools(registerToolFn: (tool: Tool) => void): Promise<string[]> {
    // Register GUI Agent tool if available
    if (this.browserGUIAgent) {
      const guiAgentTool = this.browserGUIAgent.getTool();
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
  private registerCustomBrowserTools(registerToolFn: (tool: Tool) => void): void {
    if (!this.browserGUIAgent) {
      this.logger.warn('GUI Agent not initialized, cannot register custom browser tools');
      return;
    }

    // Use centralized tool factories
    const navigationTools = createNavigationTools(this.logger, this.browserGUIAgent);
    const contentTools = createContentTools(this.logger, this.browserGUIAgent);
    const statusTools = createStatusTools(this.logger, this.browserGUIAgent);
    const visualTools = createVisualTools(this.logger, this.browserGUIAgent);

    // Register all tools
    [...navigationTools, ...contentTools, ...statusTools, ...visualTools].forEach((tool) => {
      registerToolFn(tool);
      this.registeredTools.add(tool.name);
    });

    this.logger.info(`Registered ${this.registeredTools.size} custom browser tools`);
  }
}
