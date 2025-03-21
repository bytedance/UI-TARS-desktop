import { SearchProvider, ToolCall } from '@agent-infra/shared';
import {
  SearchClient,
  SearchProvider as SearchProviderEnum,
} from '@agent-infra/search';
import { MCPToolResult } from '@main/type';
import { tavily as tavilyCore } from '@tavily/core';
import { SettingStore } from '@main/store/setting';

export const tavily = tavilyCore;

const searchByTavily = async (options: { count: number; query: string }) => {
  const currentSearchConfig = SettingStore.get('search');
  const client = tavily({
    apiKey: process.env.TAVILY_API_KEY || currentSearchConfig?.apiKey,
  });
  const searchOptions = {
    maxResults: options.count,
  };

  const response = await client.search(options.query, searchOptions);
  return {
    pages: (response.results || []).map((item) => ({
      title: item.title || '',
      url: item.url,
      content: item.content,
    })),
  };
};

export async function search(toolCall: ToolCall): Promise<MCPToolResult> {
  const currentSearchConfig = SettingStore.get('search');
  const args = JSON.parse(toolCall.function.arguments);

  try {
    if (!currentSearchConfig) {
      const client = new SearchClient({
        provider: SearchProviderEnum.DuckduckgoSearch,
        providerConfig: {},
      });
      const results = await client.search({
        query: args.query,
        count: args.count || 10,
      });
      return [
        {
          isError: false,
          content: results,
        },
      ];
    }

    let results;
    if (currentSearchConfig.provider === SearchProvider.TAVILY) {
      results = await searchByTavily({
        count: args.count,
        query: args.query,
      });
    } else if (
      currentSearchConfig.provider === SearchProvider.DUCKDUCKGO_SEARCH
    ) {
      const client = new SearchClient({
        provider: SearchProviderEnum.DuckduckgoSearch,
        providerConfig: {},
      });
      results = await client.search({
        query: args.query,
        count: args.count,
      });
      // } else if (currentSearchConfig.provider === SearchProvider.BROWSER_SEARCH) {
      //   const client = new SearchClient({
      //     provider: SearchProviderEnum.BrowserSearch,
      //     providerConfig: {
      //       browserOptions: {
      //         headless: true,
      //       },
      //       defaultEngine: 'bing',
      //     },
      //   });
      //   results = await client.search({
      //     query: args.query,
      //     count: args.count || 10,
      //   });
    } else {
      // Only for Bing Search, because Tavily is not supported in the bundle of this packages
      // Error info: trvily is not defined
      const client = new SearchClient({
        provider: SearchProviderEnum.BingSearch,
        providerConfig: {
          apiKey: currentSearchConfig.apiKey,
          baseUrl: currentSearchConfig.baseUrl,
        },
      });

      results = await client.search({
        query: args.query,
        count: args.count || 10,
      });
    }

    return [
      {
        isError: false,
        content: results,
      },
    ];
  } catch (e) {
    console.error('Search error:', e);
    return [
      {
        isError: true,
        content: [JSON.stringify(e)],
      },
    ];
  }
}
