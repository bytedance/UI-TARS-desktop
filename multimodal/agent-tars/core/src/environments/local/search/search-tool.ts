/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, Tool, z } from '@tarko/mcp-agent';
import { SearchClient, SearchConfig, SearchProvider } from '@agent-infra/search';
import { AgentTARSSearchOptions } from '@agent-tars/interface';
import { LocalBrowser, RemoteBrowser } from '@agent-infra/browser';

/**
 * Configuration for search tool provider
 */
export interface SearchToolConfig extends AgentTARSSearchOptions {
  /** External browser instance for browser_search provider */
  externalBrowser?: LocalBrowser | RemoteBrowser;
  cdpEndpoint?: string;
}

/**
 * SearchToolProvider - Direct integration with agent-infra/search
 *
 * This class provides a clean interface for creating search tools that
 * directly use the SearchClient from agent-infra/search, eliminating the
 * need for the mcp-server-search middleware.
 */
export class SearchToolProvider {
  private logger: ConsoleLogger;
  private searchClient: SearchClient<SearchProvider>;
  private config: SearchToolConfig;

  /**
   * Create a new search tool provider
   *
   * @param logger - Logger instance
   * @param config - Search configuration
   */
  constructor(logger: ConsoleLogger, config: SearchToolConfig) {
    this.logger = logger.spawn('SearchToolProvider');
    this.config = config;

    // Map string provider to SearchProvider enum
    const provider = this.mapProviderString(config.provider);

    // Create search client configuration
    const searchConfig: SearchConfig<SearchProvider> = {
      provider,
      providerConfig: {
        // @ts-expect-error browser seach only
        engine: config.browserSearch?.engine || 'google',
        needVisitedUrls: config.browserSearch?.needVisitedUrls || false,
        cdpEndpoint: config.cdpEndpoint,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      },
      logger: this.logger,
    };

    // FIXME: Un-comment it after refine launch state management of `@agent-infra/browser` and
    // Add browser instance for browser search if provided
    // if (provider === SearchProvider.BrowserSearch && config.externalBrowser) {
    //   // @ts-expect-error - The types are not perfectly aligned
    //   searchConfig.providerConfig.browser = config.externalBrowser;
    //   // @ts-expect-error
    //   searchConfig.providerConfig.keepBrowserOpen = true;
    // }

    // Initialize search client
    this.searchClient = new SearchClient(searchConfig);
    this.logger.info(`Search tool provider initialized with ${config.provider}`);
  }

  /**
   * Map string provider name to SearchProvider enum
   */
  private mapProviderString(provider: string): SearchProvider {
    const providerMap: Record<string, SearchProvider> = {
      browser_search: SearchProvider.BrowserSearch,
      bing: SearchProvider.BingSearch,
      tavily: SearchProvider.Tavily,
      searxng: SearchProvider.SearXNG,
      duckduckgo: SearchProvider.DuckduckgoSearch,
    };

    const resolvedProvider = providerMap[provider] || SearchProvider.BrowserSearch;
    this.logger.debug(`Mapped provider ${provider} to ${resolvedProvider}`);

    return resolvedProvider;
  }

  /**
   * Create a search tool definition that can be registered with an agent
   *
   * @returns Tool definition for agent registration
   */
  createSearchTool(): Tool {
    const MAX_WORDS = 7;

    return new Tool({
      id: 'web_search',
      description:
        `⚠️ SEARCH QUERY LENGTH LIMIT: ${MAX_WORDS} WORDS MAXIMUM ⚠️\n\n` +
        'Search the web for information. For best results:\n' +
        '1) Use CONCISE queries (3-5 words ideal)\n' +
        '2) Include only ESSENTIAL keywords, not full questions\n' +
        '3) For complex topics, use multiple simple searches instead of one long query\n' +
        '4) Focus on specific terms that will appear on relevant pages',
      parameters: z.object({
        query: z.string().describe(`Search query - MUST BE CONCISE (maximum ${MAX_WORDS} words)`),
        count: z
          .number()
          .optional()
          .describe(`Number of results to return (default: ${this.config.count || 10})`),
      }),
      function: async ({ query, count }) => {
        if (!query || query.trim() === '') {
          return {
            error: 'Search query is required',
          };
        }

        try {
          this.logger.info(`Performing search: "${query}" (count: ${count || this.config.count})`);

          const results = await this.searchClient.search({
            query,
            count: count || this.config.count,
          });

          return results.pages;
        } catch (error) {
          this.logger.error(`Search error: ${error}`);
          return {
            error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });
  }
}
