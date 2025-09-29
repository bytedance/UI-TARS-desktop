/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { Tool, z } from '@tarko/mcp-agent';
import { ConsoleLogger } from '@tarko/mcp-agent';
import { BrowserManager } from '../browser-manager';

/**
 * Creates visual/screenshot tools for browser
 *
 * @param logger - Logger for error reporting
 * @param browserManager - Browser manager instance
 * @returns Array of visual tools
 */
export function createVisualTools(logger: ConsoleLogger, browserManager: BrowserManager) {
  // Screenshot tool
  const screenshotTool = new Tool({
    id: 'browser_screenshot',
    description:
      '[browser] Take a screenshot of the current page or a specific area. this tool SHOULD NOT be called unless the user requests an explicit call.',
    parameters: z.object({
      area: z
        .array(z.number())
        .length(4)
        .optional()
        .describe(
          'Optional area to capture as [x1, y1, x2, y2]. If not provided, captures the entire viewport.',
        ),
    }),
    function: async ({ area }) => {
      try {
        if (!browserManager.isLaunchingComplete()) {
          return { status: 'error', message: 'Browser not initialized' };
        }

        const browser = browserManager.getBrowser();
        const page = await browser.getActivePage();

        // Create images directory if it doesn't exist
        const imagesDir = path.join(process.cwd(), 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const slug = `screenshot-${timestamp}`;
        const filename = `${slug}.png`;
        const filepath = path.join(imagesDir, filename);

        // Take screenshot
        if (area && area.length === 4) {
          // Take screenshot of specific area
          const [x1, y1, x2, y2] = area;
          await page.screenshot({
            path: filepath,
            clip: {
              x: x1,
              y: y1,
              width: x2 - x1,
              height: y2 - y1,
            },
          });
          logger.info(
            `Took screenshot of area [${x1}, ${y1}, ${x2}, ${y2}] and saved to ${filepath}`,
          );
        } else {
          // Take full screenshot
          await page.screenshot({ path: filepath });
          logger.info(`Took full screenshot and saved to ${filepath}`);
        }

        return {
          status: 'success',
          filepath: filepath,
          slug: slug,
          message: `Screenshot saved to ${filepath}`,
        };
      } catch (error) {
        logger.error(`Error taking screenshot: ${error}`);
        return {
          status: 'error',
          message: `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  });

  return [screenshotTool];
}
