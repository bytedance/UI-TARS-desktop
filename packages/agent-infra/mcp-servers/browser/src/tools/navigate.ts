import { z } from 'zod';
import { TimeoutError } from 'puppeteer-core';
import { removeHighlights } from '@agent-infra/browser-use';
import { defineTool } from './defineTool.js';

const navigateTool = defineTool({
  name: 'browser_navigate',
  config: {
    description: 'Navigate to a URL',
    inputSchema: {
      url: z.string(),
    },
  },
  handle: async (ctx, args) => {
    const { page, logger, buildDomTree } = ctx;

    try {
      await page.goto(args.url);

      logger.info('navigateTo complete');
      const { clickableElements } = (await buildDomTree(page)) || {};
      logger.info('clickableElements', clickableElements);
      await removeHighlights(page);

      return {
        content: [
          {
            type: 'text',
            text:
              `Navigated to ${args.url}` +
              (clickableElements
                ? `\nclickable elements(Might be outdated, if an error occurs with the index element, use \`browser_get_clickable_elements\` to refresh it): \n${clickableElements}`
                : 'No clickable elements found'),
          },
        ],
        isError: false,
      };
    } catch (error: unknown) {
      // Check if it's a timeout error
      if (
        error instanceof TimeoutError ||
        (error as Error)?.message?.includes('timeout')
      ) {
        logger.warn(
          'Navigation timeout, but page might still be usable:',
          error,
        );
        // You might want to check if the page is actually loaded despite the timeout
        return {
          content: [
            {
              type: 'text',
              text: 'Navigation timeout, but page might still be usable:',
            },
          ],
          isError: false,
        };
      } else {
        logger.error('NavigationTo failed:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Navigation failed ${error instanceof Error ? error?.message : error}`,
            },
          ],
          isError: true,
        };
      }
    }
  },
});

const goBackTool = defineTool({
  name: 'browser_go_back',
  config: {
    description: 'Go back to the previous page',
  },
  handle: async (ctx, args) => {
    const { page, logger } = ctx;

    try {
      await page.goBack();
      logger.info('Navigation back completed');
      return {
        content: [{ type: 'text', text: 'Navigated back' }],
        isError: false,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warn(
          'Back navigation timeout, but page might still be usable:',
          error,
        );
        return {
          content: [
            {
              type: 'text',
              text: 'Back navigation timeout, but page might still be usable:',
            },
          ],
          isError: false,
        };
      } else {
        logger.error('Could not navigate back:', error);
        return {
          content: [
            {
              type: 'text',
              text: 'Could not navigate back',
            },
          ],
          isError: true,
        };
      }
    }
  },
});

const goForwardTool = defineTool({
  name: 'browser_go_forward',
  config: {
    description: 'Go forward to the next page',
  },
  handle: async (ctx, args) => {
    const { page, logger } = ctx;

    try {
      await page.goForward();
      logger.info('Navigation back completed');
      return {
        content: [{ type: 'text', text: 'Navigated forward' }],
        isError: false,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        logger.warn(
          'forward navigation timeout, but page might still be usable:',
          error,
        );
        return {
          content: [
            {
              type: 'text',
              text: 'forward navigation timeout, but page might still be usable:',
            },
          ],
          isError: false,
        };
      } else {
        logger.error('Could not navigate forward:', error);
        return {
          content: [
            {
              type: 'text',
              text: 'Could not navigate forward',
            },
          ],
          isError: true,
        };
      }
    }
  },
});

export default [navigateTool, goBackTool, goForwardTool];
