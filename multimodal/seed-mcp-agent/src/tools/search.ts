import { Tool, z } from '@multimodal/agent';
import { McpManager } from './mcp';

export class SearchToolProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'Search',
      description: '',
      parameters: z.object({
        query: z.string().describe('The search query to research'),
      }),
      function: async ({ query }) => {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.Google,
          name: 'google_search',
          args: {
            q: query,
          },
        });
      },
    });
  }
}
