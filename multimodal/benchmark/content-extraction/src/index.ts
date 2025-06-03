/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkRunner } from './benchmark-runner';
import {
  RawContentStrategy,
  MarkdownStrategy,
  ReadabilityStrategy,
  OptimizedStrategy,
} from './strategies';
import { BenchmarkConfig } from './types';

/**
 * Main entry point for content extraction benchmark
 *
 * This script tests different content extraction strategies against a target URL
 * and compares their performance, extracted content length, and token efficiency.
 */
async function main() {
  // Define URLs to benchmark
  const urls = [
    'https://github.com/OSU-NLP-Group/GUI-Agents-Paper-List',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
  ];

  // Parse command line arguments
  const args = process.argv.slice(2);
  const saveToDisk = args.includes('--save') || args.includes('-s');
  const customUrl = args.find((arg) => !arg.startsWith('-'));

  // Configure benchmark
  const config: BenchmarkConfig = {
    urls: customUrl ? [customUrl] : urls,
    runsPerStrategy: 3, // Run each strategy 3 times for performance metrics
    collectMemoryUsage: false, // Set to true if --expose-gc flag is used
    waitUntil: 'domcontentloaded', // Default page loading strategy
    saveToDisk: saveToDisk,
    outputDir: 'result',
  };

  // Initialize benchmark runner
  const benchmarkRunner = new BenchmarkRunner();

  // Define strategies to test
  const strategies = [
    new RawContentStrategy(), // Baseline raw HTML content
    new MarkdownStrategy(), // Current browser_get_markdown implementation
    new ReadabilityStrategy(), // Mozilla Readability-based implementation
    new OptimizedStrategy(), // Advanced optimized implementation
  ];

  // Run benchmark
  const results = await benchmarkRunner.runBenchmark(strategies, undefined, config);

  // Present results
  benchmarkRunner.presentResults(results);
}

// Run main function
main().catch(console.error);
