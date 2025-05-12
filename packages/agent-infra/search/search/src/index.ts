/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { SearchProvider } from '@agent-infra/shared';
import {
  BrowserSearchConfig,
  BrowserSearchOptions,
  BrowserSearch,
  SearchResult as BrowserSearchResult,
} from '@agent-infra/browser-search';
import {
  BingSearchClient,
  BingSearchConfig,
  BingSearchOptions,
} from '@agent-infra/bing-search';
import {
  DuckDuckGoSearchClient,
  DuckDuckGoSearchClientConfig,
  DuckDuckGoSearchOptions,
} from '@agent-infra/duckduckgo-search';
import { Logger, defaultLogger } from '@agent-infra/logger';
import { TavilySearchConfig, TavilySearchOptions, tavily } from './tavily';
import { SearXNGSearchConfig, SearXNGSearchOptions, searxng } from './searxng';

export { SearchProvider };
export interface SearchProviderConfigMap {
  [SearchProvider.BrowserSearch]: BrowserSearchConfig;
  [SearchProvider.BingSearch]: BingSearchConfig;
  [SearchProvider.Tavily]: TavilySearchConfig;
  [SearchProvider.DuckduckgoSearch]: DuckDuckGoSearchClientConfig;
  [SearchProvider.SearXNG]: SearXNGSearchConfig;
}

export type SearchProviderConfig<T> = T extends SearchProvider
  ? SearchProviderConfigMap[T]
  : object;

export interface SearchProviderSearchOptionsMap {
  [SearchProvider.BrowserSearch]: BrowserSearchOptions;
  [SearchProvider.BingSearch]: BingSearchOptions;
  [SearchProvider.Tavily]: TavilySearchOptions;
  [SearchProvider.DuckduckgoSearch]: DuckDuckGoSearchOptions;
  [SearchProvider.SearXNG]: SearXNGSearchOptions;
}

export type SearchProviderSearchOptions<T> = T extends SearchProvider
  ? SearchProviderSearchOptionsMap[T]
  : object;

/**
 * Common search options shared by all providers
 */
export interface CommonSearchOptions {
  /**
   * Search query
   */
  query: string;
  /**
   * Max search count
   */
  count?: number;
}

/**
 * Standardized search result page
 */
export type PageResult = {
  /**
   * Page title
   */
  title: string;
  /**
   * Page URL
   */
  url: string;
  /**
   * Page content or snippet
   */
  content: string;
};

/**
 * Unified search result format
 */
export interface SearchResult {
  /**
   * List of page results
   */
  pages: PageResult[];
}

/**
 * Search config.
 */
export interface SearchConfig<T extends SearchProvider> {
  /**
   * Search provider to use
   */
  provider: T;
  /**
   * Provider-specific configuration
   */
  providerConfig: SearchProviderConfig<T>;
  /**
   * Logger
   */
  logger?: Logger;
}

/**
 * Unified search client that works with multiple search providers
 * @template T The search provider type
 */
export class SearchClient<T extends SearchProvider> {
  private logger: Logger;

  /**
   * Creates a new search client
   * @param config Client configuration
   */
  constructor(private config: SearchConfig<T>) {
    this.logger = config?.logger ?? defaultLogger;
  }

  /**
   * Performs a search using the configured provider
   * @param options Common search options
   * @param originalOptions Provider-specific search options
   * @returns Standardized search results
   */
  async search(
    options: CommonSearchOptions,
    originalOptions?: Partial<SearchProviderSearchOptions<T>>,
  ): Promise<SearchResult> {
    switch (this.config.provider) {
      case SearchProvider.BrowserSearch: {
        const client = new BrowserSearch({
          logger: this.logger,
          ...(this.config.providerConfig as BrowserSearchConfig),
        });
        const searchOptions: BrowserSearchOptions = {
          ...((originalOptions as BrowserSearchOptions) || {}),
          query: options.query,
          count: options.count,
        };

        const results = await client.perform(searchOptions);
        return {
          pages: results.map((item: BrowserSearchResult) => ({
            title: item.title,
            url: item.url,
            content: item.content,
          })),
        };
      }

      case SearchProvider.BingSearch: {
        const client = new BingSearchClient({
          logger: this.logger,
          ...(this.config.providerConfig as BingSearchConfig),
        });
        const searchOptions: BingSearchOptions = {
          count: options.count,
          ...((originalOptions as Partial<BingSearchOptions>) || {}),
          q: options.query,
        };

        const response = await client.search(searchOptions);
        return {
          pages: (response.webPages?.value || []).map((item) => ({
            title: item.name,
            url: item.url,
            content: item.snippet,
          })),
        };
      }

      case SearchProvider.Tavily: {
        const client = tavily(this.config.providerConfig as TavilySearchConfig);
        const searchOptions: TavilySearchOptions = {
          maxResults: options.count,
          ...((originalOptions as TavilySearchOptions) || {}),
        };

        const response = await client.search(options.query, searchOptions);
        return {
          pages: (response.results || []).map((item) => ({
            title: item.title || '',
            url: item.url,
            content: item.content,
          })),
        };
      }

      case SearchProvider.SearXNG: {
        const client = searxng(
          this.config.providerConfig as SearXNGSearchConfig,
        );
        const searchOptions: SearXNGSearchOptions = {
          count: options.count,
          ...((originalOptions as SearXNGSearchOptions) || {}),
          query: options.query,
        };

        const response = await client.search(options.query, searchOptions);
        return {
          pages: (response.results || []).map((item) => ({
            title: item.title || '',
            url: item.url,
            content: item.content,
          })),
        };
      }

      case SearchProvider.DuckduckgoSearch: {
        const client = new DuckDuckGoSearchClient(
          this.config.providerConfig as DuckDuckGoSearchClientConfig,
        );
        const searchOptions: DuckDuckGoSearchOptions = {
          ...((originalOptions as DuckDuckGoSearchOptions) || {}),
        };

        const response = await client.search({
          ...searchOptions,
          retry: {
            retries: 1,
            randomize: true,
          },
          query: options.query,
          count: options.count,
        });
        return {
          pages: (response.results || []).map((item) => ({
            title: item.title || '',
            url: item.url,
            content: item.description,
          })),
        };
      }

      default:
        throw new Error(`Unsupported search provider: ${this.config.provider}`);
    }
  }
}

export * from './tavily';
