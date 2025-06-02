/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@multimodal/mcp-agent';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { BrowserGUIAgent } from '../browser-gui-agent';

/**
 * Creates a set of navigation-related browser tools
 *
 * @param logger - Logger for error reporting
 * @param browserGUIAgent - Browser GUI agent instance
 * @returns Array of navigation tools
 */
export function createNavigationTools(logger: ConsoleLogger, browserGUIAgent: BrowserGUIAgent) {
  // Navigate to URL tool
  const navigateTool = new Tool({
    id: 'browser_navigate',
    description: '[browser] Navigate to a URL',
    parameters: z.object({
      url: z.string().describe('URL to navigate to'),
    }),
    function: async ({ url }) => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        return {
          status: 'success',
          message: `Navigated to ${url}`,
        };
      } catch (error) {
        logger.error(`Error navigating to URL: ${error}`);
        return {
          status: 'error',
          message: `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  // Back navigation tool
  const backTool = new Tool({
    id: 'browser_go_back',
    description: '[browser] Go back to the previous page',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        await page.goBack();

        return {
          status: 'success',
          message: 'Navigated back',
        };
      } catch (error) {
        logger.error(`Error navigating back: ${error}`);
        return {
          status: 'error',
          message: `Failed to navigate back: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  // Forward navigation tool
  const forwardTool = new Tool({
    id: 'browser_go_forward',
    description: '[browser] Go forward to the next page',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        await page.goForward();

        return {
          status: 'success',
          message: 'Navigated forward',
        };
      } catch (error) {
        logger.error(`Error navigating forward: ${error}`);
        return {
          status: 'error',
          message: `Failed to navigate forward: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  // Refresh tool
  const refreshTool = new Tool({
    id: 'browser_refresh',
    description: '[browser] Refresh the current page',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserGUIAgent) {
          return { status: 'error', message: 'GUI Agent not initialized' };
        }

        const page = await browserGUIAgent.getPage();
        await page.reload();

        return {
          status: 'success',
          message: 'Page refreshed',
        };
      } catch (error) {
        logger.error(`Error refreshing page: ${error}`);
        return {
          status: 'error',
          message: `Failed to refresh: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  return [navigateTool, backTool, forwardTool, refreshTool];
}
