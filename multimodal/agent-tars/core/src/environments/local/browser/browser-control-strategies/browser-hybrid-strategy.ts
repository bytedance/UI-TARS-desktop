/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '@tarko/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';
import { createContentTools, createNavigationTools, createVisualTools } from '../tools';

/**
 * BrowserHybridStrategy - Implements the 'hybrid' browser control mode
 *
 * This strategy provides a hybrid approach that combines both GUI Agent (vision-based)
 * and MCP Browser (DOM-based) tools without handling conflicts between them.
 */
export class BrowserHybridStrategy extends AbstractBrowserControlStrategy {
  /**
   * Register both GUI Agent tools and complementary MCP Browser tools
   */
  async registerTools(registerToolFn: (tool: Tool) => void): Promise<string[]> {
    if (this.browserGUIAgent) {
      const guiAgentTool = this.browserGUIAgent.getTool();
      registerToolFn(guiAgentTool);
      this.registeredTools.add(guiAgentTool.name);
    }

    if (this.browserManager) {
      const contentTools = createContentTools(this.logger, this.browserManager);
      const navigationTools = createNavigationTools(this.logger, this.browserManager);
      const visualTools = createVisualTools(this.logger, this.browserManager);

      [...navigationTools, ...contentTools, ...visualTools].forEach((tool) => {
        registerToolFn(tool);
        this.registeredTools.add(tool.name);
      });
    }

    if (this.browserClient) {
      const browserTools = [
        'browser_click',
        'browser_form_input_fill',
        'browser_press_key',
        'browser_hover',
        'browser_scroll',
        'browser_select',
        'browser_get_clickable_elements',
        'browser_read_links',
        'browser_tab_list',
        'browser_new_tab',
        'browser_close_tab',
        'browser_switch_tab',
        'browser_evaluate',
      ];

      await this.registerMCPBrowserTools(registerToolFn, browserTools);
    }

    return Array.from(this.registeredTools);
  }
}
