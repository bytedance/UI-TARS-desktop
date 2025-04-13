import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@main/type';
import { tavily as tavilyCore } from '@tavily/core';
import { SettingStore } from '@main/store/setting';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';
import { jsonrepair } from 'jsonrepair';

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

/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function search(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
  const currentSearchConfig = settings || SettingStore.get('search');
  const args = JSON.parse(jsonrepair(toolCall.function.arguments)) as {
    query: string;
    count?: number;
  };
  const count = args?.count ?? currentSearchConfig.providerConfig?.count ?? 10;
  try {
    logger.info(
      'Search provider: ',
      currentSearchConfig.provider,
      'Search query:',
      maskSensitiveData({ query: args.query, count: args.count }),
    );

    let results: SearchResult;

    if (!currentSearchConfig) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.DuckduckgoSearch,
        providerConfig: {},
      });
      results = await client.search({
        query: args.query,
        count,
      });
      return [
        {
          isError: false,
          content: results,
        },
      ];
    }

    if (currentSearchConfig.provider === SearchProvider.Tavily) {
      results = await searchByTavily({
        query: args.query,
        count,
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
        count,
      });
    } else if (currentSearchConfig.provider === SearchProvider.BrowserSearch) {
      const client = new SearchClient({
        logger,
        provider: SearchProvider.BrowserSearch,
        providerConfig: {
          browserOptions: {
            headless: false,
          },
          defaultEngine: currentSearchConfig.providerConfig.engine ?? 'bing',
        },
      });
      results = await client.search(
        {
          query: args.query,
          count,
        },
        { needVisitedUrls: currentSearchConfig.providerConfig.needVisitedUrls },
      );
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
        count,
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
        count,
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
