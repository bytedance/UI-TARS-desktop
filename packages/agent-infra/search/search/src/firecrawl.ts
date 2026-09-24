/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Firecrawl } from 'firecrawl';

/**
 * Configuration for the Firecrawl client.
 *
 * `apiKey` is optional — Firecrawl exposes a keyless free tier (rate-limited
 * per IP) for `search` and `scrape`. Provide a key (`fc-...`) for higher
 * limits. `apiUrl` targets a self-hosted Firecrawl instance.
 */
export interface FirecrawlSearchConfig {
  /** Firecrawl API key (`fc-...`). Optional on the keyless free tier. */
  apiKey?: string;
  /** Override the API base URL, e.g. a self-hosted Firecrawl deployment. */
  apiUrl?: string;
}

/**
 * Scrape options forwarded to Firecrawl for each search result. Mirrors the
 * `scrapeOptions` of the `/search` endpoint — when set, every result is
 * returned with full-page content (markdown/html/links) rather than only a
 * snippet.
 */
export interface FirecrawlScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot'>;
  onlyMainContent?: boolean;
}

/**
 * Provider-specific search options. These map directly onto the Firecrawl
 * `/search` endpoint parameters.
 */
export interface FirecrawlSearchOptions {
  /** Max results to return (per source). */
  limit?: number;
  /** Which result types to fetch. Defaults to web results. */
  sources?: Array<'web' | 'news' | 'images'>;
  /** Geo-locate the search, e.g. "Germany". */
  location?: string;
  /** Time-based filter, e.g. "qdr:d" (past 24h), "qdr:w" (past week). */
  tbs?: string;
  /** Request timeout in milliseconds. */
  timeout?: number;
  /**
   * When provided, each result is scraped and returned with full-page
   * content. Omit to get search snippets only (cheaper, faster).
   */
  scrapeOptions?: FirecrawlScrapeOptions;
}

/**
 * Create a Firecrawl client. Kept in the same factory style as the other
 * search providers so it slots cleanly into the unified `SearchClient`.
 */
export function firecrawl(config: FirecrawlSearchConfig): Firecrawl {
  return new Firecrawl({
    apiKey: config.apiKey,
    ...(config.apiUrl ? { apiUrl: config.apiUrl } : {}),
  });
}

export { Firecrawl };
