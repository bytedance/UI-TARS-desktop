/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, Tool } from '@multimodal/agent';
import { BrowserSearch } from '@agent-infra/browser-search';
import { ConsoleLogger } from '@agent-infra/logger';
import { ContentProcessor } from '../utils/content-processor';
import { SearchOptimizer } from '../utils/search-optimizer';

/**
 * Enhanced search tool with advanced features:
 * - Additional search parameters (domain, timeRange)
 * - Query optimization
 * - Result deduplication
 * - Fallback search mechanism
 * - Key information extraction
 *
 * FIXME: support timeRange
 */
export const EnhancedSearchTool = new Tool({
  id: 'web-search',
  description:
    'Perform comprehensive web search with advanced options for detailed information gathering',
  parameters: z.object({
    query: z.string().describe('The search query to research'),
    count: z.number().optional().describe('Number of results to fetch (default: 5)'),
    engine: z
      .enum(['google', 'bing', 'baidu'])
      .optional()
      .describe('Search engine to use (default: google)'),
    domain: z.string().optional().describe('Limit search to specific domain (e.g., "github.com")'),
  }),
  function: async ({ query, count = 5, engine = 'google', domain }) => {
    const logger = new ConsoleLogger('[EnhancedSearch]');
    logger.info(`Researching: "${query}" using ${engine} search engine`);

    // Optimize the query
    const optimizedQuery = SearchOptimizer.optimizeQuery(query);

    // Add domain restriction if specified
    const finalQuery = domain ? `${optimizedQuery} site:${domain}` : optimizedQuery;

    logger.info(`Optimized query: "${finalQuery}"`);

    // Initialize browser search
    const browserSearch = new BrowserSearch({
      logger,
      browserOptions: {
        headless: true,
      },
    });

    try {
      // Perform the search with enhanced parameters
      const results = await browserSearch.perform({
        query: finalQuery,
        count: count as number,
        engine,
        needVisitedUrls: true,
      });

      logger.info(`Found ${results.length} results for "${finalQuery}"`);

      // If no results, try alternative queries
      if (results.length === 0) {
        logger.warn(`No results found, trying alternative queries`);
        const alternatives = SearchOptimizer.generateAlternativeQueries(query);

        for (const altQuery of alternatives) {
          logger.info(`Trying alternative query: "${altQuery}"`);
          const altResults = await browserSearch.perform({
            query: altQuery,
            count: count as number,
            engine,
            needVisitedUrls: true,
          });

          if (altResults.length > 0) {
            logger.info(`Found ${altResults.length} results with alternative query`);
            // Process these results instead
            results.push(...altResults);
            break;
          }
        }
      }

      // Extract key information from each result instead of simple trimming
      const processedResults = results.map((result, index) => {
        // Extract key information instead of just trimming
        const keyInfo = ContentProcessor.extractKeyInformation(result.content, 1500);

        return {
          index: index + 1,
          title: result.title,
          url: result.url,
          content: keyInfo,
          snippet: result.snippet || '',
        };
      });

      // Deduplicate results
      const deduplicatedResults = SearchOptimizer.deduplicateResults(processedResults);

      return {
        query,
        optimizedQuery: finalQuery,
        engine,
        domain: domain || 'any',
        totalResults: deduplicatedResults.length,
        results: deduplicatedResults,
      };
    } catch (error) {
      logger.error(`Error in web search: ${error}`);
      return {
        error: `Failed to perform search: ${error}`,
        query,
      };
    } finally {
      await browserSearch.closeBrowser();
    }
  },
});
