/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SearchTimeRange defines time ranges for search results
 */
export enum SearchTimeRange {
  ANY = 'any',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

/**
 * SearchParameters defines all possible parameters for search
 */
export interface SearchParameters {
  query: string;
  count?: number;
  engine?: 'google' | 'bing' | 'baidu';
  domain?: string;
  timeRange?: SearchTimeRange;
}

/**
 * SearchResult represents a single search result
 */
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  snippet?: string;
}

/**
 * SearchOptimizer provides methods to optimize search queries and results
 */
export class SearchOptimizer {
  /**
   * Optimize a search query to improve result quality
   * @param query Original search query
   * @returns Optimized search query
   */
  static optimizeQuery(query: string): string {
    // Remove unnecessary words to focus the query
    const fillerWords = ['please', 'can you', 'i want to', 'tell me about', 'information on'];
    let optimized = query;

    for (const word of fillerWords) {
      optimized = optimized.replace(new RegExp(word, 'gi'), '');
    }

    // Add quotes around specific phrases to improve precision
    const terms = optimized.split(' ');
    if (terms.length >= 4) {
      // Find potential phrases (2-3 words) and add quotes
      for (let i = 0; i < terms.length - 1; i++) {
        if (terms[i].length > 3 && terms[i + 1].length > 3) {
          // Only add quotes to important-looking phrases
          const phrase = `${terms[i]} ${terms[i + 1]}`;
          if (!phrase.match(/^[a-z\s]+$/)) {
            // Not just lowercase words
            optimized = optimized.replace(phrase, `"${phrase}"`);
          }
        }
      }
    }

    return optimized.trim();
  }

  /**
   * Generate alternative queries for backup search
   * @param originalQuery The original search query
   * @returns Array of alternative search queries
   */
  static generateAlternativeQueries(originalQuery: string): string[] {
    const alternatives = [];

    // Add broader version of the query
    alternatives.push(originalQuery.split(' ').slice(0, 3).join(' '));

    // Add more specific version with 'details' or 'information'
    alternatives.push(`${originalQuery} details`);
    alternatives.push(`${originalQuery} information`);

    // Add version with 'recent' for newer results
    alternatives.push(`recent ${originalQuery}`);

    return alternatives.filter((q) => q !== originalQuery);
  }

  /**
   * Deduplicate search results to remove similar content
   * @param results Array of search results
   * @returns Deduplicated array of search results
   */
  static deduplicateResults(results: SearchResult[]): SearchResult[] {
    const deduplicated: SearchResult[] = [];
    const seenDomains = new Set<string>();
    const seenContent = new Set<string>();

    for (const result of results) {
      // Extract domain from URL
      const urlObj = new URL(result.url);
      const domain = urlObj.hostname;

      // Create a content fingerprint for similarity detection
      const contentWords = result.content.toLowerCase().split(/\s+/).slice(0, 50).join(' ');

      // Check if we've seen too many results from this domain
      const domainCount = [...seenDomains].filter((d) => d === domain).length;

      // Add result if it's not a duplicate and domain isn't over-represented
      if (!seenContent.has(contentWords) && domainCount < 2) {
        deduplicated.push(result);
        seenDomains.add(domain);
        seenContent.add(contentWords);
      }
    }

    return deduplicated;
  }
}
