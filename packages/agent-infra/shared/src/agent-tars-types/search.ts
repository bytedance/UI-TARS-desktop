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

export type LocalBrowserSearchEngine = 'google' | 'bing' | 'baidu' | 'sogou';

/**
 * FIXME: remove it.
 */
export interface SearchSettings {
  provider: SearchProvider;
  providerConfig: {
    // #region Common provider config
    /**
     * Search result count
     */
    count: number;
    // #endregion

    // #region Local browser search config
    /**
     * Local broeser search engine
     */
    engine: LocalBrowserSearchEngine;
    /**
     * Whether to open the link to crawl detail
     */
    needVisitedUrls?: boolean;
    // #endregion
  };
  apiKey: string;
  baseUrl?: string;
}
