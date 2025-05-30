/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@multimodal/mcp-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { BrowserGUIAgent } from '../browser-gui-agent';
import { PaginatedContentExtractor } from '../content-extractor';

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
  // Create a shared content extractor instance
  const contentExtractor = new PaginatedContentExtractor(logger.spawn('ContentExtractor'));

  // Get markdown tool - Core content extraction functionality
  const getMarkdownTool = new Tool({
    id: 'browser_get_markdown',
    description:
      '[browser] Get the content of the current page as markdown with pagination support',
    parameters: z.object({
      page: z
        .number()
        .optional()
        .describe(
          'Page number to extract (default: 1), in most cases, you do not need to pass this parameter.',
        ),
    }),
    function: async ({ page = 1 }) => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const browserPage = await browserGUIAgent.getPage();

        // Extract content using the paginated extractor
        const result = await contentExtractor.extractContent(browserPage, page);

        // Add pagination information to the tool result
        return {
          content: result.content,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            hasMorePages: result.hasMorePages,
          },
          title: result.title,
        };
      } catch (error) {
        logger.error(`Error extracting markdown: ${error}`);
        return {
          status: 'error',
          message: `Failed to extract content: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  return [getMarkdownTool];
}
