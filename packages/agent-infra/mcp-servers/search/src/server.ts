/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  SearchClient,
  SearchConfig,
  SearchProvider,
  PageResult,
} from '@agent-infra/search';
import type { SearchSettings } from '@agent-infra/shared';
import type { LocalBrowser } from '@agent-infra/browser';

let searchSetting: SearchSettings & { externalBrowser: LocalBrowser | null } = {
  provider: SearchProvider.BrowserSearch,
  providerConfig: {
    count: 10,
    engine: 'google',
  },
  apiKey: '',
  baseUrl: '',
  externalBrowser: null,
};

export function setSearchConfig(config: Partial<SearchSettings>) {
  searchSetting = {
    ...searchSetting,
    ...config,
    providerConfig: {
      ...searchSetting.providerConfig,
      ...(config.providerConfig || {}),
    },
  };
}

const API_KEY_ENV_MAP = {
  [SearchProvider.BingSearch]: process.env.BING_SEARCH_API_KEY,
  [SearchProvider.Tavily]: process.env.TAVILY_API_KEY,
  [SearchProvider.BrowserSearch]: undefined,
  [SearchProvider.SearXNG]: undefined,
  [SearchProvider.DuckduckgoSearch]: undefined,
};

const API_BASE_URL_ENV_MAP = {
  [SearchProvider.BingSearch]: process.env.BING_SEARCH_API_BASE_URL,
  [SearchProvider.Tavily]: undefined,
  [SearchProvider.BrowserSearch]: undefined,
  [SearchProvider.SearXNG]: undefined,
  [SearchProvider.DuckduckgoSearch]: undefined,
};

/**
 * Perform search.
 */
async function performSearch(
  query: string,
  count?: number,
): Promise<CallToolResult> {
  if (!query) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: 'Search query is required',
        },
      ],
    };
  }

  const provider = searchSetting.provider;
  const providerConfig = searchSetting.providerConfig;
  const resultCount = count || providerConfig.count;

  try {
    const searchConfig: SearchConfig<SearchProvider> = {
      provider: provider,
      providerConfig: {
        baseUrl: searchSetting.baseUrl ?? API_BASE_URL_ENV_MAP[provider],
        apiKey: searchSetting.apiKey ?? API_KEY_ENV_MAP[provider],
        // @ts-expect-error FIXME: we need a better type design here.
        engine: providerConfig.engine,
        needVisitedUrls: providerConfig.needVisitedUrls,
      },
    };

    // Pass external browser for browser_search provider
    if (
      provider === SearchProvider.BrowserSearch &&
      searchSetting.externalBrowser
    ) {
      // @ts-expect-error
      searchConfig.providerConfig.browser = searchSetting.externalBrowser;
      // @ts-expect-error
      searchConfig.providerConfig.keepBrowserOpen = true;
    }

    const searchClient = new SearchClient(searchConfig);

    const results = await searchClient.search({
      query,
      count: resultCount,
    });

    return {
      isError: false,
      content: formatSearchResults(results.pages, query),
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Search error: ${error.message}`,
          name: 'ERROR',
        },
      ] as TextContent[],
    };
  }
}

function formatSearchResults(
  pages: PageResult[],
  query: string,
): TextContent[] {
  const messages: TextContent[] = [
    {
      type: 'text',
      text: `Search results for: "${query}"`,
      name: 'QUERY',
    },
  ];

  if (pages.length === 0) {
    messages.push({
      type: 'text',
      text: 'No results found.',
      name: 'RESULTS',
    });
    return messages;
  }

  // FIXME: return original
  const resultsText = pages
    .map((page, index) => {
      return `[${index + 1}] ${page.title}
URL: ${page.url}
${page.content}`;
    })
    .join('\n\n---\n\n');

  messages.push({
    type: 'text',
    text: resultsText,
    name: 'RESULTS',
  });

  return messages;
}

export function createServer(config?: SearchSettings): McpServer {
  if (config) {
    setSearchConfig(config);
  }

  const server = new McpServer({
    name: 'Web Search',
    version: process.env.VERSION || '0.0.1',
  });

  // === Tools ===
  server.tool(
    'web_search',
    'Search the web for information',
    {
      query: z.string().describe('Search query'),
      count: z
        .number()
        .optional()
        .describe(
          `Number of results to return (default: ${searchSetting.providerConfig.count})`,
        ),
    },
    async (args) => await performSearch(args.query, args.count),
  );

  return server;
}
