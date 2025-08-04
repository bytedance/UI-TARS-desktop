import { BrowserSearch } from '@agent-infra/browser-search';
import { Tool, z } from '../../../src';

export const SearchTool = new Tool({
  id: 'web-search',
  description: 'Perform a comprehensive web search on a topic and extract detailed information',
  parameters: z.object({
    query: z.string().describe('The search query to research'),
    count: z.number().optional().describe('Number of results to fetch (default: 3)'),
  }),
  function: async ({ query, count = 3 }) => {
    const browserSearch = new BrowserSearch({
      browserOptions: {
        headless: false, // Run in headful mode
      },
    });
    const results = await browserSearch.perform({
      query: query as string,
      count: count as number,
      engine: 'google',
      needVisitedUrls: true,
    });

    return results;
  },
});
