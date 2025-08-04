/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@tarko/mcp-agent';
import { ConsoleLogger } from '@tarko/mcp-agent';
import { BrowserManager } from '../browser-manager';

/**
 * Creates a set of navigation-related browser tools
 *
 * @param logger - Logger for error reporting
 * @param browserManager - Browser manager instance
 * @returns Array of navigation tools
 */
export function createNavigationTools(logger: ConsoleLogger, browserManager: BrowserManager) {
  // Navigate to URL tool
  const navigateTool = new Tool({
    id: 'browser_navigate',
    description: '[browser] Navigate to a URL',
    parameters: z.object({
      url: z.string().describe('URL to navigate to'),
    }),
    function: async ({ url }) => {
      try {
        if (!browserManager.isLaunchingComplete()) {
          return { status: 'error', message: 'Browser not initialized' };
        }

        const browser = browserManager.getBrowser();
        const page = await browser.getActivePage();

        // FIXME: Error: Navigating frame was detached
        await page.goto(url, { waitUntil: [] });

        return {
          status: 'success',
          url,
          message: `Navigated success`,
        };
      } catch (error) {
        logger.error(`Error navigating to URL: ${error}`);
        return {
          status: 'error',
          url,
          message: `Failed to navigate: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  // Back navigation tool
  const backTool = new Tool({
    id: 'browser_go_back',
    description: '[browser] Go back to the previous page, or close tab if no history exists',
    parameters: z.object({}),
    function: async () => {
      try {
        if (!browserManager.isLaunchingComplete()) {
          return { status: 'error', message: 'Browser not initialized' };
        }

        const browser = browserManager.getBrowser();
        const page = await browser.getActivePage();

        // Check if there's page history to go back to
        const hasHistory = await page.evaluate(() => {
          return window.history.length > 1;
        });

        if (hasHistory) {
          // If there's history, go back normally
          await page.goBack();
          return {
            status: 'success',
            message: 'Navigated back',
          };
        } else {
          // If no history, this might be a new tab - handle appropriately
          const browser = page.browser();
          const pages = await browser.pages();

          // Only close if there's more than one page
          if (pages.length > 1) {
            // Get current page URL for reporting
            const currentUrl = page.url();

            // Close the current page
            await page.close();

            logger.info(`Closed tab with URL ${currentUrl} (no history to go back to)`);

            return {
              status: 'success',
              message: 'No history available, closed the current tab instead',
              action: 'closed',
            };
          } else {
            // If it's the only page, navigate to blank page
            await page.goto('about:blank');

            return {
              status: 'success',
              message: 'No history available and only one tab open, navigated to blank page',
              action: 'blank',
            };
          }
        }
      } catch (error) {
        logger.error(`Error handling back navigation: ${error}`);
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
        if (!browserManager.isLaunchingComplete()) {
          return { status: 'error', message: 'Browser not initialized' };
        }

        const browser = browserManager.getBrowser();
        const page = await browser.getActivePage();
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
        if (!browserManager.isLaunchingComplete()) {
          return { status: 'error', message: 'Browser not initialized' };
        }

        const browser = browserManager.getBrowser();
        const page = await browser.getActivePage();
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
