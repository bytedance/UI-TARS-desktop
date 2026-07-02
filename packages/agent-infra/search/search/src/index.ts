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
import {
  FirecrawlSearchConfig,
  FirecrawlSearchOptions,
  firecrawl,
} from './firecrawl';

export { SearchProvider };
export interface SearchProviderConfigMap {
  [SearchProvider.BrowserSearch]: BrowserSearchConfig;
  [SearchProvider.BingSearch]: BingSearchConfig;
  [SearchProvider.Tavily]: TavilySearchConfig;
  [SearchProvider.DuckduckgoSearch]: DuckDuckGoSearchClientConfig;
  [SearchProvider.SearXNG]: SearXNGSearchConfig;
  [SearchProvider.Firecrawl]: FirecrawlSearchConfig;
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
  [SearchProvider.Firecrawl]: FirecrawlSearchOptions;
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
          ...((originalOptions as unknown as BrowserSearchOptions) || {}),
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
          ...((originalOptions as unknown as SearXNGSearchOptions) || {}),
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
          ...((originalOptions as unknown as DuckDuckGoSearchOptions) || {}),
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

      case SearchProvider.Firecrawl: {
        const client = firecrawl(
          this.config.providerConfig as FirecrawlSearchConfig,
        );
        const firecrawlOptions =
          (originalOptions as FirecrawlSearchOptions) || {};

        const response = await client.search(options.query, {
          limit: options.count,
          ...firecrawlOptions,
        });

        // Firecrawl groups results by source type (web/news/images). Flatten
        // web + news into the unified page list. When `scrapeOptions` was set,
        // each result is a scraped `Document` carrying full-page `markdown` and
        // its URL under `metadata.sourceURL` (no top-level `url`); plain results
        // carry a top-level `url` + `description`. Read both shapes, then drop
        // any item we couldn't resolve a URL for.
        type FirecrawlItem = {
          url?: string;
          title?: string;
          description?: string;
          snippet?: string;
          markdown?: string;
          metadata?: { sourceURL?: string; title?: string };
        };
        const web = (response.web ?? []) as FirecrawlItem[];
        const news = (response.news ?? []) as FirecrawlItem[];

        const isResolved = (page: {
          title: string;
          url?: string;
          content: string;
        }): page is PageResult => !!page.url;

        return {
          pages: [
            ...web.map((item) => ({
              title: item.title || item.metadata?.title || '',
              url: item.url || item.metadata?.sourceURL,
              content: item.markdown || item.description || '',
            })),
            ...news.map((item) => ({
              title: item.title || item.metadata?.title || '',
              url: item.url || item.metadata?.sourceURL,
              content: item.snippet || item.description || '',
            })),
          ].filter(isResolved),
        };
      }

      default:
        throw new Error(`Unsupported search provider: ${this.config.provider}`);
    }
  }
}

export * from './tavily';
export * from './firecrawl';
