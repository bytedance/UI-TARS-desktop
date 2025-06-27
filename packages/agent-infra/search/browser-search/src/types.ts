/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserInterface, LaunchOptions, Page } from '@agent-infra/browser';
import { Logger } from '@agent-infra/logger';
import { LocalBrowserSearchEngine } from '@agent-infra/shared';

export type { LocalBrowserSearchEngine };

export type SearchResult = {
  title: string;
  url: string;
  content: string;
  snippet: string;
};

export interface BrowserSearchOptions {
  /**
   * Search query
   */
  query: string | string[];
  /**
   * Max results length
   */
  count?: number;
  /**
   * Concurrency search
   */
  concurrency?: number;
  /**
   * Excluded domains
   */
  excludeDomains?: string[];
  /**
   * Max length to extract, rest content will be truncated
   */
  truncate?: number;
  /**
   * Control whether to keep the browser open after search finished
   */
  keepBrowserOpen?: boolean;
  /**
   * Search engine to use (default: 'google')
   */
  engine?: LocalBrowserSearchEngine;
  /**
   * need visited urls
   * @default false
   */
  needVisitedUrls?: boolean;
}

export interface BrowserSearchConfig {
  /**
   * Logger
   */
  logger?: Logger;
  /**
   * Used to connect to a remote browser.
   * Once it's configured, "browser" and "browserOptions" won't take effect.
   */
  cdpEndpoint?: string;
  /**
   * Custom browser
   */
  browser?: BrowserInterface;
  /**
   * Custom browser options
   */
  browserOptions?: LaunchOptions;
  /**
   * Set default search engine
   *
   * @default {'google'}
   */
  defaultEngine?: LocalBrowserSearchEngine;
}

export interface SearchEngineAdapter {
  /**
   * Get search URL for the specific engine
   */
  getSearchUrl(
    query: string,
    options: {
      count?: number;
      excludeDomains?: string[];
    },
  ): string;

  /**
   * Extract search results from the page
   */
  extractSearchResults(window: Window): SearchResult[];

  /**
   * Wait for search results to load
   * This method will be called after page navigation
   * @param page Puppeteer page object
   */
  waitForSearchResults?(page: Page): Promise<void>;
}
