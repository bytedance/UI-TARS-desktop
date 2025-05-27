/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolDefinition, Tool, z } from '@multimodal/mcp-agent';
import { AbstractBrowserControlStrategy } from './base-strategy';

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
    if (this.guiAgent) {
      const guiAgentTool = this.guiAgent.getToolDefinition();
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
    // Register navigation tool
    const navigateTool = new Tool({
      id: 'browser_navigate',
      description: '[browser] Navigate to a URL',
      parameters: z.object({
        url: z.string().describe('URL to navigate to'),
      }),
      function: async ({ url }) => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          await page.goto(url, { waitUntil: 'networkidle2' });

          return {
            status: 'success',
            message: `Navigated to ${url}`,
          };
        } catch (error) {
          this.logger.error(`Error navigating to URL: ${error}`);
          return {
            status: 'error',
            message: `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });

    // Register back navigation tool
    const backTool = new Tool({
      id: 'browser_back',
      description: '[browser] Go back to the previous page',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          await page.goBack();

          return {
            status: 'success',
            message: 'Navigated back',
          };
        } catch (error) {
          this.logger.error(`Error navigating back: ${error}`);
          return {
            status: 'error',
            message: `Failed to navigate back: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });

    // Register forward navigation tool
    const forwardTool = new Tool({
      id: 'browser_forward',
      description: '[browser] Go forward to the next page',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          await page.goForward();

          return {
            status: 'success',
            message: 'Navigated forward',
          };
        } catch (error) {
          this.logger.error(`Error navigating forward: ${error}`);
          return {
            status: 'error',
            message: `Failed to navigate forward: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });

    // Register refresh tool
    const refreshTool = new Tool({
      id: 'browser_refresh',
      description: '[browser] Refresh the current page',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          await page.reload();

          return {
            status: 'success',
            message: 'Page refreshed',
          };
        } catch (error) {
          this.logger.error(`Error refreshing page: ${error}`);
          return {
            status: 'error',
            message: `Failed to refresh: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });

    // Register get markdown tool
    const getMarkdownTool = new Tool({
      id: 'browser_get_markdown',
      description: '[browser] Get the content of the current page as markdown',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();

          // Extract page content using Readability
          const markdown = await page.evaluate(() => {
            // Simple markdown conversion from HTML
            const convertToMarkdown = (html: string) => {
              const div = document.createElement('div');
              div.innerHTML = html;

              // Remove script and style elements
              const scripts = div.querySelectorAll('script, style');
              scripts.forEach((el) => el.remove());

              // Simple text extraction
              return div.textContent || '';
            };

            return convertToMarkdown(document.body.innerHTML);
          });

          return markdown;
        } catch (error) {
          this.logger.error(`Error extracting markdown: ${error}`);
          return `Failed to extract content: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

    // Register URL and title tools
    const getUrlTool = new Tool({
      id: 'browser_get_url',
      description: '[browser] Get the current page URL',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          return await page.url();
        } catch (error) {
          this.logger.error(`Error getting URL: ${error}`);
          return `Failed to get URL: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

    const getTitleTool = new Tool({
      id: 'browser_get_title',
      description: '[browser] Get the current page title',
      parameters: z.object({}),
      function: async () => {
        try {
          if (!this.guiAgent) {
            return { status: 'error', message: 'GUI Agent not initialized' };
          }

          const page = await this.guiAgent.getPage();
          return await page.title();
        } catch (error) {
          this.logger.error(`Error getting title: ${error}`);
          return `Failed to get title: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    });

    // Register all tools
    [
      navigateTool,
      backTool,
      forwardTool,
      refreshTool,
      getMarkdownTool,
      getUrlTool,
      getTitleTool,
    ].forEach((tool) => {
      registerToolFn(tool);
      this.registeredTools.add(tool.name);
    });

    this.logger.info(`Registered ${this.registeredTools.size} custom browser tools`);
  }
}
