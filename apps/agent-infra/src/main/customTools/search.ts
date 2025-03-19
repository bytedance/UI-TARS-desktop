import { ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchProvider } from '@agent-infra/search';
import { MCPToolResult } from '@main/type';

export async function search(toolCall: ToolCall): Promise<MCPToolResult> {
  const args = JSON.parse(toolCall.function.arguments);

  const client = new SearchClient({
    provider: SearchProvider.BingSearch,
    providerConfig: {
      apiKey: process.env.BING_SEARCH_API_KEY,
      baseUrl: process.env.BING_SEARCH_API_BASE_URL,
    },
  });

  try {
    // Perform a search
    const results = await client.search({
      query: args.query,
      count: 10,
    });

    return [
      {
        isError: false,
        content: results,
      },
    ];
  } catch (e) {
    return [
      {
        isError: true,
        content: [JSON.stringify(e)],
      },
    ];
  }
}
