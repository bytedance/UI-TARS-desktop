/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';

/**
 * BrowserUseOnlyStrategy - Implements the 'browser-use-only' browser control mode
 *
 * This strategy uses exclusively DOM-based tools from the MCP Browser server
 * for all browser interactions, without any vision-based capabilities.
 */
export class BrowserUseOnlyStrategy extends AbstractBrowserControlStrategy {
  /**
   * Register all MCP Browser tools
   */
  async registerTools(registerToolFn: (tool: ToolDefinition) => void): Promise<string[]> {
    if (!this.browserClient) {
      this.logger.warn('Browser client not set, cannot register browser tools');
      return [];
    }

    const browserTools = [
      // Navigation tools
      'browser_navigate',
      'browser_back',
      'browser_forward',
      'browser_refresh',
      'browser_screenshot',

      // Content tools
      'browser_get_markdown',
      'browser_get_html',
      'browser_get_text',

      // Interaction tools
      'browser_click',
      'browser_type',
      'browser_press',
      'browser_hover',
      'browser_drag',
      'browser_scroll',
      'browser_form_input_fill',
      'browser_select',

      // Status tools
      'browser_get_url',
      'browser_get_title',
      'browser_get_elements',
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

    return Array.from(this.registeredTools);
  }
}
