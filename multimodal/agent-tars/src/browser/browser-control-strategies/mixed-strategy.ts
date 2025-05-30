/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';
import { createContentTools } from '../tools';

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
    if (this.browserGUIAgent) {
      const guiAgentTool = this.browserGUIAgent.getToolDefinition();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);

      // Register custom markdown extraction tool instead of MCP-provided one
      const contentTools = createContentTools(this.logger, this.browserGUIAgent);
      contentTools.forEach((tool) => {
        registerToolFn(tool);
        this.registeredTools.add(tool.name);
      });
    }

    // Register all browser tools from MCP Browser server except markdown extraction
    if (this.browserClient) {
      // Register all browser tools except content extraction tools
      // Use our custom markdown tool instead
      const browserTools = [
        // Navigation tools
        'browser_navigate',
        'browser_go_back',
        'browser_go_forward',

        // Skip `browser_get_markdown` - using custom implementation
        // 'browser_get_markdown',

        // Interaction tools
        'browser_click',
        'browser_form_input_fill',
        'browser_press_key',
        'browser_hover',
        'browser_scroll',
        'browser_select',

        // Status tools
        'browser_get_clickable_elements',
        'browser_read_links',

        // Visual tools
        'browser_screenshot',

        // Tab management
        'browser_tab_list',
        'browser_new_tab',
        'browser_close_tab',
        'browser_switch_tab',

        // Advanced tools
        'browser_evaluate',
      ];

      await this.registerMCPBrowserTools(registerToolFn, browserTools);
    }

    return Array.from(this.registeredTools);
  }
}
