/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SearXNGSearchConfig {
  baseUrl?: string;
}

export interface SearXNGSearchOptions {
  query: string;
  count?: number;
  language?: string;
  categories?: string[];
  time_range?: string;
  safesearch?: 0 | 1 | 2; // 0: close, 1: mid, 2: high
}

export interface SearXNGSearchResult {
  title: string;
  url: string;
  content: string;
  engine?: string;
  score?: number;
}

export interface SearXNGSearchResponse {
  query: string;
  results: SearXNGSearchResult[];
}

export const searxng = (config: SearXNGSearchConfig = {}) => {
  const { baseUrl = 'https://127.0.0.1:8081' } = config;

  const search = async (
    query: string,
    options: Partial<SearXNGSearchOptions> = {},
  ): Promise<SearXNGSearchResponse> => {
    const {
      count = 10,
      language = 'zh-CN',
      categories = ['general'],
      time_range,
      safesearch = 1,
    } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        language,
        categories: categories.join(','),
        safesearch: safesearch.toString(),
        count: count.toString(),
      });

      if (time_range) {
        params.append('time_range', time_range);
      }

      const response = await fetch(`${baseUrl}/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `SearXNG search failed with status: ${response.status}`,
        );
      }

      const data = await response.json();

      return {
        query,
        results: data.results
          .map((result: any) => ({
            title: result.title || '',
            url: result.url || '',
            content: result.content || result.snippet || '',
            engine: result.engine,
            score: result.score,
          }))
          .slice(0, count),
      };
    } catch (error) {
      console.error('SearXNG search error:', error);
      throw error;
    }
  };

  return { search };
};
