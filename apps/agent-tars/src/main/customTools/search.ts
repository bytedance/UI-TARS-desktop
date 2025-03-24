import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient } from '@agent-infra/search';
import { MCPToolResult } from '@main/type';
import { tavily as tavilyCore } from '@tavily/core';
import { SettingStore } from '@main/store/setting';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

export const tavily = tavilyCore;

/**
 * FIXME: Remove duplication
 *
 * There are some redundant code at
 * - packages/agent-infra/search/search
 * - packages/agent-infra/shared/src/agent-tars-types/search.ts
 *
 * Maybe related to https://github.com/bytedance/UI-TARS-desktop/issues/382.
 */
const searchByTavily = async (options: { count: number; query: string }) => {
  const currentSearchConfig = SettingStore.get('search');
  const apiKey = process.env.TAVILY_API_KEY || currentSearchConfig?.apiKey;
  const client = tavily({
    apiKey,
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

export async function search(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
  const currentSearchConfig = settings || SettingStore.get('search');
  const args = JSON.parse(toolCall.function.arguments);

  try {
    logger.info(
      'Search query:',
      maskSensitiveData({ query: args.query, count: args.count }),
    );

    if (!currentSearchConfig) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.DuckduckgoSearch,
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
    if (currentSearchConfig.provider === SearchProvider.Tavily) {
      results = await searchByTavily({
        count: args.count,
        query: args.query,
      });
    } else if (
      currentSearchConfig.provider === SearchProvider.DuckduckgoSearch
    ) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.DuckduckgoSearch,
        providerConfig: {},
      });
      results = await client.search({
        query: args.query,
        count: args.count,
      });
    } else if (currentSearchConfig.provider === SearchProvider.BrowserSearch) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.BrowserSearch,
        providerConfig: {
          browserOptions: {
            headless: false,
          },
          defaultEngine: currentSearchConfig.defaultEngine || 'bing',
        },
      });
      results = await client.search({
        query: args.query,
        count: args.count || 10,
      });
    } else if (currentSearchConfig.provider === SearchProvider.SearXNG) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.SearXNG,
        providerConfig: {
          baseUrl: currentSearchConfig.baseUrl,
        },
      });

      results = await client.search({
        query: args.query,
        count: args.count,
      });
    } else {
      // Only for Bing Search, because Tavily is not supported in the bundle of this packages
      // Error info: trvily is not defined
      const client = new SearchClient({
        logger,
        provider: SearchProvider.BingSearch,
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

    logger.info('[Search] results:', results);

    return [
      {
        isError: false,
        content: results,
      },
    ];
  } catch (e) {
    const rawErrorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error('[Search] error: ' + rawErrorMessage);
    return [
      {
        isError: true,
        content: [rawErrorMessage],
      },
    ];
  }
}
