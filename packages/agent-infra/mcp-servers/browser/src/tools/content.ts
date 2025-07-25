import { z } from 'zod';
import { defineTool } from './defineTool.js';
import { toMarkdown, extractContent } from '@agent-infra/browser-context';

const getMarkdownTool = defineTool({
  name: 'browser_get_markdown',
  config: {
    description: 'Get the markdown content of the current page',
    inputSchema: {},
  },
  handle: async (ctx, _args) => {
    const { page, logger } = ctx;
    try {
      let result;
      try {
        // only cjs
        const { Defuddle } = await import('defuddle/node');
        result = await Defuddle(await page.content(), page.url());
      } catch (e) {
        logger.error('Failed to browser_get_markdown, try readability', e);
        const readabilityResult = await extractContent(page as any);
        result = {
          title: readabilityResult.title,
          content: readabilityResult.fullContent,
        };
      }

      const { title, content } = result;

      logger.info(`[browser_get_markdown]: title: ${result}`);
      const markdown = toMarkdown(
        '<title>' + title + '</title>' + content || '',
      );
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
