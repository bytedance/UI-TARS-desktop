/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';

/**
 * MixedControlStrategy - Implements the 'default' browser control mode
 *
 * This strategy provides a hybrid approach that combines both GUI Agent (vision-based)
 * and MCP Browser (DOM-based) tools without handling conflicts between them.
 */
export class MixedControlStrategy extends AbstractBrowserControlStrategy {
  /**
   * Register both GUI Agent tools and complementary MCP Browser tools
   */
  async registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]> {
    // Register GUI Agent tool if available
    if (this.guiAgent) {
      const guiAgentTool = this.guiAgent.getToolDefinition();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);
    }

    // Register all browser tools from MCP Browser server
    if (this.browserClient) {
      // Register all browser tools except less useful content extraction tools
      // Prefer browser_get_markdown over other content extraction tools
      const browserTools = [
        // Navigation tools
        'browser_navigate',
        'browser_back',
        'browser_forward',
        'browser_refresh',

        // Content tools
        'browser_get_markdown',

        // Interaction tools
        'browser_click',
        'browser_type',
        'browser_press',
        'browser_hover',
        'browser_drag',
        'browser_scroll',

        // Status tools
        'browser_get_url',
        'browser_get_title',
        'browser_get_elements',

        // Visual tools
        'browser_screenshot',

        // Tab management
        'browser_tab_list',
        'browser_new_tab',
        'browser_close_tab',
        'browser_switch_tab',
      ];

      await this.registerMCPBrowserTools(registerToolFn, browserTools);
    }

    return Array.from(this.registeredTools);
  }
}
