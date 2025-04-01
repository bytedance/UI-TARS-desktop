/**
 * Supported search providers
 */
export enum SearchProvider {
  /**
   * Browser-based search using headless browser
   */
  BrowserSearch = 'browser_search',
  /**
   * Bing Search API
   */
  BingSearch = 'bing_search',
  /**
   * Tavily Search API
   */
  Tavily = 'tavily',
  /**
   * Duckduckgo Search API
   */
  DuckduckgoSearch = 'duckduckgo_search',
  /**
   * SearXNG Search API
   */
  SearXNG = 'searxng',
}

export type LocalBrowserSearchEngine = 'google' | 'bing' | 'baidu';

export interface SearchSettings {
  provider: SearchProvider;
  providerConfig: {
    // Common
    count: number;
    // Browser Search
    engine: LocalBrowserSearchEngine;
    // Whether to open the link to crawl detail
    needVisitedUrls?: boolean;
  };
  apiKey: string;
  baseUrl?: string;
}
