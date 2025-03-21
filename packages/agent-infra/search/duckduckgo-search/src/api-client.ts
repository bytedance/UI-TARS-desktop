/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger, defaultLogger } from '@agent-infra/logger';
import * as DDG from 'duck-duck-scrape';
import asyncRetry from 'async-retry';
import { SearchOptions, SearchResults } from 'duck-duck-scrape';
import AsyncRetry from 'async-retry';

export interface DuckDuckGoSearchResponse extends SearchResults {}

/**
 * Options for performing a DuckDuckGo search
 */
export interface DuckDuckGoSearchOptions extends SearchOptions {
  query: string;
  /**
   * Number of results to return
   * @default 5
   */
  count?: number;
  /**
   * retry options
   * @default false
   * * retries: ${times},
   * * onRetry() {}
   */
  retry?: AsyncRetry.Options;
}

export interface DuckDuckGoSearchClientConfig {
  logger?: Logger;
}

/**
 * Client for interacting with DuckDuckGo Search API
 */
export class DuckDuckGoSearchClient {
  private logger: Logger;
  private config?: DuckDuckGoSearchClientConfig;

  /**
   * Creates a new instance of DuckDuckGoSearchClient
   *
   * @param config - Configuration options for the client
   */
  constructor(config?: DuckDuckGoSearchClientConfig) {
    this.config = config;
    this.logger = config?.logger ?? defaultLogger;
  }

  /**
   * Perform DuckDuckGo search
   * @param params Search parameters
   * @returns Search results
   */
  async search(
    params: DuckDuckGoSearchOptions,
  ): Promise<DuckDuckGoSearchResponse> {
    this.logger.log('search params', params);

    try {
      const { query, count = 5, retry, ...restParams } = params;

      const result = await asyncRetry(
        () =>
          DDG.search(query, {
            safeSearch: DDG.SafeSearchType.STRICT,
            ...restParams,
          }),
        retry,
      );
      console.log('result', result);
      return result
        ? {
            noResults: result.noResults,
            vqd: result.vqd,
            results: result.results.slice(0, count),
          }
        : {
            noResults: true,
            vqd: '',
            results: [],
          };
    } catch (error) {
      this.logger.error('Error performing DuckDuckGo search:', error);
      throw error;
    }
  }
}
