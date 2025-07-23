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
      description: `
    Function:
    def Search(query: str):
        """
        这是一个联网搜索工具，输入搜索问题，返回网页列表与对应的摘要信息。搜索问题应该简洁清晰，复杂问题应该拆解成多步并一步一步搜索。如果没有搜索到有用的页面，可以调整问题描述（如减少限定词、更换搜索思路）后再次搜索。搜索结果质量和语种有关，对于中文资源可以尝试输入中文问题，非中资源可以尝试使用英文或对应语种。

        Args:
            - query (str) [Required]: 搜索问题
        """
    `,
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
