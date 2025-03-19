import { SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchProvider } from '@agent-infra/search';
import { MCPToolResult } from '@main/type';

let currentSearchConfig: SearchSettings | null = null;

export function updateSearchConfig(config: SearchSettings) {
  currentSearchConfig = config;
}

export async function search(toolCall: ToolCall): Promise<MCPToolResult> {
  if (!currentSearchConfig) {
    throw new Error('Search configuration not set');
  }

  const args = JSON.parse(toolCall.function.arguments);

  const client = new SearchClient({
    provider: SearchProvider.BingSearch,
    providerConfig: {
      apiKey: currentSearchConfig.apiKey,
      baseUrl: currentSearchConfig.baseUrl,
    },
  });

  try {
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
