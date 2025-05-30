/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@multimodal/mcp-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { BrowserGUIAgent } from '../browser-gui-agent';

/**
 * Creates content extraction tools for browser
 *
 * These tools extract page content in various formats and are implementation-agnostic,
 * meaning they can be used regardless of the browser control strategy.
 *
 * @param logger - Logger for error reporting
 * @param browserGUIAgent - Browser GUI agent instance
 * @returns Array of content extraction tools
 */
export function createContentTools(logger: ConsoleLogger, browserGUIAgent: BrowserGUIAgent) {
  // Get markdown tool - Core content extraction functionality
  const getMarkdownTool = new Tool({
    id: 'browser_get_markdown',
    description: '[browser] Get the content of the current page as markdown',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();

        // Extract page content using DOM manipulation
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

          const result = convertToMarkdown(document.body.innerHTML);
          throw new Error('[browser_get_markdown] result length: ' + result.length);

          return result;
        });

        return markdown;
      } catch (error) {
        logger.error(`Error extracting markdown: ${error}`);
        return `Failed to extract content: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  return [getMarkdownTool];
}
