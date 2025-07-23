import { MCPClient } from '@agent-infra/mcp-client';

export interface McpManagerOptions {
  SerperApiKey: string;
  TavilyApiKey: string;
}

export class McpManager {
  static McpClientType = {
    Tavily: 'tavily_client',
    Google: 'google_search_client',
  };

  public client: MCPClient;

  constructor(options: McpManagerOptions) {
    this.client = new MCPClient([
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Tavily,
        description: 'google search tool',
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${options.TavilyApiKey}`,
      },
      {
        type: 'streamable-http',
        name: McpManager.McpClientType.Google,
        description: 'google search tool',
        url: 'https://7nn045cw.fn.bytedance.net/mcp',
        headers: {
          'x-serper-api-key': options.SerperApiKey,
        },
      },
    ]);
  }

  async init() {
    await this.client.init();
  }
}
