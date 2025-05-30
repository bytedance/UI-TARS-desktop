/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';

/**
 * Content extraction strategy interface
 * Defines the contract that all content extraction strategies must implement
 */
export interface ContentExtractionStrategy {
  /**
   * Unique name of the strategy
   */
  readonly name: string;

  /**
   * Brief description of how the strategy works
   */
  readonly description: string;

  /**
   * Extract content from a webpage
   * @param browser - Browser instance
   * @param url - URL to extract content from
   * @param waitUntil - Page navigation wait condition
   * @returns Promise with extraction result
   */

  extractContent(
    browser: LocalBrowser,
    url: string,
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2',
  ): Promise<ContentExtractionResult>;
}

/**
 * Result of content extraction
 */
export interface ContentExtractionResult {
  /**
   * Extracted content in string format
   */
  content: string;

  /**
   * Original page content length (for comparison)
   */
  originalLength: number;

  /**
   * Additional metadata about the extraction
   */
  metadata?: Record<string, any>;
}

/**
 * Benchmark result for a single strategy
 */
export interface BenchmarkResult extends ContentExtractionResult {
  /**
   * Strategy name that produced this result
   */
  strategyName: string;

  /**
   * Strategy description
   */
  strategyDescription: string;

  /**
   * Extracted content length
   */
  extractedLength: number;

  /**
   * Token count of extracted content
   */
  tokenCount: number;

  /**
   * Time taken for extraction (ms)
   */
  executionTime: number;

  /**
   * Peak memory usage (MB) if available
   */
  peakMemoryUsage?: number;

  /**
   * URL that was tested
   */
  url?: string;
}

/**
 * Aggregated benchmark results for a strategy run multiple times
 */
export interface AggregatedBenchmarkResult {
  /**
   * Strategy name
   */
  strategyName: string;

  /**
   * Strategy description
   */
  strategyDescription: string;

  /**
   * Original content length
   */
  originalLength: number;

  /**
   * Average extracted content length
   */
  avgExtractedLength: number;

  /**
   * Average token count
   */
  avgTokenCount: number;

  /**
   * Average execution time (ms)
   */
  avgExecutionTime: number;

  /**
   * Standard deviation of execution time (ms)
   */
  stdDevExecutionTime: number;

  /**
   * Minimum execution time (ms)
   */
  minExecutionTime: number;

  /**
   * Maximum execution time (ms)
   */
  maxExecutionTime: number;

  /**
   * Average peak memory usage (MB) if available
   */
  avgPeakMemoryUsage?: number;

  /**
   * Raw results from each run
   */
  rawResults: BenchmarkResult[];
}

/**
 * Benchmark configuration
 */
export interface BenchmarkConfig {
  /**
   * URLs to benchmark
   */
  urls: string[];

  /**
   * Number of runs per strategy per URL
   */
  runsPerStrategy: number;

  /**
   * Whether to collect memory usage statistics
   */
  collectMemoryUsage: boolean;

  /**
   * Page navigation wait condition
   */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';

  /**
   * Whether to save results to disk
   */
  saveToDisk?: boolean;

  /**
   * Output directory for saved results
   */
  outputDir?: string;
}
