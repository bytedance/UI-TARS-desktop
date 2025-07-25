import { z } from 'zod';
import { defineTool } from './defineTool.js';
import { delayReject } from '../utils/utils.js';

const getMarkdownTool = defineTool({
  name: 'browser_get_markdown',
  config: {
    description: 'Get the markdown content of the current page',
    inputSchema: {},
  },
  handle: async (ctx, _args) => {
    const { page, logger } = ctx;
    try {
      await Promise.race([
        page.waitForNetworkIdle({
          idleTime: 1000,
          concurrency: 2,
        }),
        delayReject(3000),
      ]).catch((e) => {
        logger.warn(
          `Network idle timeout, continue to get markdown, error: ${e}`,
        );
      });

      const { extractContent } = await import('@agent-infra/browser-context');
      const { title, content } = await extractContent(page as any);

      const markdown = title + '\n' + content || '';
      logger.info(`[browser_get_markdown]: title: ${markdown}`);

      return {
        content: [{ type: 'text', text: markdown }],
        isError: false,
      };
    } catch (error) {
      logger.error('Failed to browser_get_markdown', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get markdown: ${(error as Error).message}`,
          },
        ],
      };
    }
  },
});

const getTextTool = defineTool({
  name: 'browser_get_text',
  config: {
    description: 'Get the text content of the current page',
    inputSchema: {},
  },
  handle: async (ctx, _args) => {
    const { page, logger } = ctx;

    try {
      const text = await page.evaluate(
        /* istanbul ignore next */
        () => document.body.innerText,
      );
      return {
        content: [{ type: 'text', text }],
        isError: false,
      };
    } catch (error) {
      logger.error('Failed to browser_get_text', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get text: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  },
});

const readLinksTool = defineTool({
  name: 'browser_read_links',
  config: {
    description: 'Get all links on the current page',
    outputSchema: {
      links: z.array(
        z.object({
          text: z.string(),
          href: z.string(),
        }),
      ),
    },
  },
  handle: async (ctx, _args) => {
    const { page, logger } = ctx;
    try {
      const links = await page.evaluate(
        /* istanbul ignore next */ () => {
          const linkElements = document.querySelectorAll('a[href]');
          return Array.from(linkElements)
            .map((el) => ({
              text: (el as HTMLElement).innerText,
              href: el.getAttribute('href') || '',
            }))
            .filter((link) => link.href);
        },
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(links, null, 2) }],
        structuredContent: {
          links,
        },
        isError: false,
      };
    } catch (error) {
      logger.error('Failed to browser_read_links', error);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to read links: ${(error as Error).message}`,
          },
        ],
        structuredContent: {
          links: [],
        },
        isError: true,
      };
    }
  },
});

export default [getMarkdownTool, getTextTool, readLinksTool];
