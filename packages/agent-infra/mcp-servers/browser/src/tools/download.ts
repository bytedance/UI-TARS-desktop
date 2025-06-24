import { z } from 'zod';
import { defineTool } from './defineTool.js';
import { store } from '../store.js';

const downloadTool = defineTool({
  name: 'browser_get_download_list',
  skipToolContext: true,
  config: {
    description: 'Get the list of downloaded files',
    outputSchema: {
      list: z.array(
        z
          .object({
            guid: z.string(),
            url: z.string(),
            suggestedFilename: z.string(),
            resourceUri: z.string(),
            createdAt: z.string(),
            progress: z.number(),
            state: z.string(),
          })
          .partial(),
      ),
    },
  },
  handle: async (_ctx, _args) => {
    const { downloadedFiles } = store;
    const content = {
      list: downloadedFiles,
    };
    return {
      isError: false,
      structuredContent: content,
      content: [{ type: 'text', text: JSON.stringify(content) }],
    };
  },
});

export default [downloadTool];
