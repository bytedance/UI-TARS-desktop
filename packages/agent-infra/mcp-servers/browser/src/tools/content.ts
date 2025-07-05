import { defineTool } from './defineTool.js';
import { toMarkdown } from '@agent-infra/shared';

const getMarkdownTool = defineTool({
  name: 'browser_get_markdown',
  config: {
    description: 'Get the markdown content of the current page',
    inputSchema: {},
  },
  handle: async (_ctx, _args) => {
    const { page } = _ctx;
    try {
      const html = await page.content();
      const markdown = toMarkdown(html);
      return {
        content: [{ type: 'text', text: markdown }],
        isError: false,
      };
    } catch (error) {
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

export default [getMarkdownTool];
