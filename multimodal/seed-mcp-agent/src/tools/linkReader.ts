import { Tool, z } from '@multimodal/agent';
import { McpManager } from './mcp';

export class LinkReaderToolProvider {
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getTool(): Tool {
    return new Tool({
      id: 'LinkReader',
      description: `
    Function:
    def LinkReader(description: str, url: str):
        """
        这是一个链接浏览工具，可以打开链接（可以是网页、pdf等）并根据需求描述汇总页面上的所有相关信息。建议对所有有价值的链接都调用该工具来获取信息，有价值的链接包括但不限于如下几种：1.任务中明确提供的网址，2.搜索结果提供的带有相关摘要的网址，3. 之前调用LinkReader返回的内容中包含的且判断可能含有有用信息的网址。请尽量避免自己凭空构造链接。

        Args:
            - description (str) [Required]: 需求描述文本，详细描述在当前url内想要获取的内容
            - url (str) [Required]: 目标链接，应该是一个完整的url（以 http 开头）
        """
    `,
      parameters: z.object({
        description: z.string().describe('需求描述文本，详细描述在当前url内想要获取的内容'),
        url: z.string().describe('目标链接，应该是一个完整的url（以 http 开头）'),
      }),
      function: async ({ description, url }) => {
        return this.mcpManager.client.callTool({
          client: McpManager.McpClientType.Tavily,
          name: 'tavily_extract',
          args: {
            extract_depth: 'basic',
            format: 'markdown',
            include_favicon: false,
            include_images: false,
            urls: [url],
          },
        });
      },
    });
  }
}
