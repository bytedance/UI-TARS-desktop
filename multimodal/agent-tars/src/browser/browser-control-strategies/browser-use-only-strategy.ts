import { ToolDefinition } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';
import { createContentTools } from '../tools';

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

    // Register custom markdown extraction tool if GUI Agent is available
    if (this.browserGUIAgent) {
      const contentTools = createContentTools(this.logger, this.browserGUIAgent);
      contentTools.forEach((tool) => {
        registerToolFn(tool);
        this.registeredTools.add(tool.name);
      });
    }

    // Register all other browser tools from MCP Browser server
    const browserTools = [
      // Navigation tools
      'browser_navigate',
      'browser_go_back',
      'browser_go_forward',

      // Skip content extraction tools - using custom implementation
      // 'browser_get_markdown',
      // 'browser_get_html',
      // 'browser_get_text',

      // Interaction tools
      'browser_click',
      'browser_press_key',
      'browser_hover',
      'browser_scroll',
      'browser_form_input_fill',
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

    return Array.from(this.registeredTools);
  }
}
