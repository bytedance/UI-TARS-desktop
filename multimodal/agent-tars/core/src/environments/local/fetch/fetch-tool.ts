/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsoleLogger, Tool, z } from '@tarko/mcp-agent';
import { firecrawl } from '@agent-infra/search';

/**
 * Configuration for the fetch tool. Reuses the search provider's credentials
 * (`apiKey` is optional — Firecrawl has a keyless free tier; `baseUrl` targets
 * a self-hosted instance).
 */
export interface FetchToolConfig {
  apiKey?: string;
  baseUrl?: string;
}

/**
 * FetchToolProvider — a `web_fetch` tool backed by Firecrawl's scrape API.
 *
 * Reads the full, LLM-ready content of a single URL without driving the
 * browser. Distinct from search (`web_search`, discovery) and from the
 * headless browser's `browser_get_markdown` (which only reads the tab the
 * browser is already on). Kept in its own provider so the search tool stays
 * search-only.
 */
export class FetchToolProvider {
  private logger: ConsoleLogger;
  private config: FetchToolConfig;

  constructor(logger: ConsoleLogger, config: FetchToolConfig) {
    this.logger = logger.spawn('FetchToolProvider');
    this.config = config;
  }

  /**
   * Create a `web_fetch` tool definition for agent registration.
   */
  createFetchTool(): Tool {
    const client = firecrawl({
      apiKey: this.config.apiKey,
      apiUrl: this.config.baseUrl,
    });

    return new Tool({
      id: 'web_fetch',
      description:
        'Fetch the full content of a specific web page as clean, LLM-ready ' +
        'markdown — without opening it in the browser. Use this when you ' +
        'already have a URL (e.g. from web_search results) and need its full ' +
        'text, not just a snippet. Handles JavaScript-rendered pages and PDFs.',
      parameters: z.object({
        url: z
          .string()
          .describe('The full URL to fetch (must start with http or https).'),
        formats: z
          .array(z.enum(['markdown', 'html', 'links']))
          .optional()
          .describe('Output formats to return. Defaults to ["markdown"].'),
      }),
      function: async ({ url, formats }) => {
        if (!url || url.trim() === '') {
          return { error: 'A url is required' };
        }

        // Enforce the http(s) contract stated in the description, and reject
        // other schemes (file:, javascript:, ...) before spending a request.
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          return { error: 'A valid URL is required' };
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return { error: 'URL must start with http:// or https://' };
        }

        // Log only origin + path — query strings may carry tokens / signed-link
        // credentials that should not land in logs.
        const safeUrl = `${parsed.origin}${parsed.pathname}`;

        try {
          this.logger.info(`Fetching: "${safeUrl}"`);

          const doc = await client.scrape(url, {
            formats: formats?.length ? formats : ['markdown'],
            onlyMainContent: true,
          });

          return {
            url,
            title: doc.metadata?.title,
            markdown: doc.markdown,
            html: doc.html,
            links: doc.links,
            metadata: doc.metadata,
          };
        } catch (error) {
          this.logger.error(`Fetch error for "${safeUrl}": ${error}`);
          return {
            error: `Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    });
  }
}
