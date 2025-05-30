/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@multimodal/mcp-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { BrowserGUIAgent } from '../browser-gui-agent';

/**
 * Creates tools for retrieving browser status information
 *
 * These tools provide essential status information like current URL and page title,
 * implemented independently from the MCP Browser server.
 *
 * @param logger - Logger for error reporting
 * @param browserGUIAgent - Browser GUI agent instance
 * @returns Array of status tools
 */
export function createStatusTools(logger: ConsoleLogger, browserGUIAgent: BrowserGUIAgent) {
  // Get URL tool
  const getUrlTool = new Tool({
    id: 'browser_get_url',
    description: '[browser] Get the current page URL',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        return await page.url();
      } catch (error) {
        logger.error(`Error getting URL: ${error}`);
        return `Failed to get URL: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  // Get title tool
  const getTitleTool = new Tool({
    id: 'browser_get_title',
    description: '[browser] Get the current page title',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        return await page.title();
      } catch (error) {
        logger.error(`Error getting title: ${error}`);
        return `Failed to get title: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });

  return [getUrlTool, getTitleTool];
}
