/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';
import { get_encoding } from '@dqbd/tiktoken';
import fs from 'fs-extra';
import path from 'path';

import {
  ContentExtractionStrategy,
  BenchmarkResult,
  AggregatedBenchmarkResult,
  BenchmarkConfig,
} from './types';
import chalk from 'chalk';

/**
 * BenchmarkRunner - Executes benchmark tests for content extraction strategies
 *
 * This class is responsible for:
 * 1. Running benchmarks for different content extraction strategies
 * 2. Measuring performance metrics (execution time, content length, token count)
 * 3. Generating and presenting benchmark results in a readable format
 * 4. Saving results to disk for further analysis
 */
export class BenchmarkRunner {
  private browser: LocalBrowser;
  private defaultConfig: BenchmarkConfig = {
    urls: ['https://github.com/OSU-NLP-Group/GUI-Agents-Paper-List'],
    runsPerStrategy: 1,
    collectMemoryUsage: false,
    waitUntil: 'domcontentloaded',
    saveToDisk: false,
    outputDir: 'result',
  };

  /**
   * Create a new benchmark runner
   */
  constructor() {
    this.browser = new LocalBrowser();
  }

  /**
   * Run benchmark for all provided strategies
   * @param strategies - List of content extraction strategies to benchmark
   * @param url - URL to test content extraction on (deprecated, use config.urls instead)
   * @param config - Benchmark configuration
   * @returns Promise with aggregated benchmark results
   */
  async runBenchmark(
    strategies: ContentExtractionStrategy[],
    url?: string,
    config?: Partial<BenchmarkConfig>,
  ): Promise<AggregatedBenchmarkResult[]> {
    // Merge config with defaults and handle backward compatibility
    const finalConfig: BenchmarkConfig = {
      ...this.defaultConfig,
      ...config,
    };

    // For backward compatibility
    if (url && !config?.urls) {
      finalConfig.urls = [url];
    }

    console.log(chalk.blue.bold('\n📊 Content Extraction Benchmark'));

    console.log(chalk.blue(`🔄 Runs per strategy: ${finalConfig.runsPerStrategy}`));
    console.log(chalk.blue(`🌐 URLs to test: ${finalConfig.urls.length}`));
    if (finalConfig.saveToDisk) {
      console.log(chalk.blue(`💾 Saving results to: ${finalConfig.outputDir}`));
    }
    console.log(chalk.blue('⏳ Running benchmarks...\n'));

    try {
      // Launch browser once for all tests
      await this.browser.launch({ headless: false });

      const allResults: BenchmarkResult[] = [];

      // For each URL
      for (const testUrl of finalConfig.urls) {
        console.log(chalk.cyan.bold(`\nTesting URL: ${testUrl}`));

        // Store the original content for reference
        let originalContent = '';
        const page = await this.browser.createPage();
        try {
          await page.goto(testUrl, { waitUntil: finalConfig.waitUntil });
          originalContent = await page.content();
        } finally {
          await page.close();
        }

        // Run each strategy multiple times
        for (const strategy of strategies) {
          console.log(chalk.yellow(`\nRunning strategy: ${strategy.name}...`));

          let contentSaved = false;
          const strategyResults: BenchmarkResult[] = [];

          for (let run = 1; run <= finalConfig.runsPerStrategy; run++) {
            console.log(chalk.yellow(`  Run ${run}/${finalConfig.runsPerStrategy}...`));

            // Capture memory usage if enabled
            let startMemory, endMemory;
            if (finalConfig.collectMemoryUsage && global.gc) {
              global.gc(); // Force garbage collection before measurement
              startMemory = process.memoryUsage();
            }

            const startTime = performance.now();
            const extractionResult = await strategy.extractContent(
              this.browser,
              testUrl,
              finalConfig.waitUntil,
            );
            const endTime = performance.now();

            if (finalConfig.collectMemoryUsage && global.gc) {
              global.gc(); // Force garbage collection before measurement
              endMemory = process.memoryUsage();
            }

            const executionTime = endTime - startTime;
            const extractedLength = extractionResult.content.length;
            const tokenCount = this.countTokens(extractionResult.content);

            const result: BenchmarkResult = {
              ...extractionResult,
              strategyName: strategy.name,
              strategyDescription: strategy.description,
              extractedLength,
              tokenCount,
              executionTime,
              url: testUrl,
            };

            // Add memory usage if available
            if (startMemory && endMemory) {
              result.peakMemoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024); // MB
            }

            // Save results to disk only once per strategy
            if (finalConfig.saveToDisk && !contentSaved) {
              await this.saveResultToDisk(result, originalContent, finalConfig.outputDir);
              contentSaved = true;
            }

            strategyResults.push(result);
            allResults.push(result);
            console.log(chalk.green(`    ✓ Completed in ${executionTime.toFixed(2)}ms`));
          }
        }
      }

      // Aggregate results
      const aggregatedResults = this.aggregateResults(allResults);

      // Save summary results to disk if enabled
      if (finalConfig.saveToDisk) {
        await this.saveSummaryResultsToDisk(aggregatedResults, finalConfig.outputDir);
      }

      return aggregatedResults;
    } finally {
      // Always close the browser
      await this.browser.close();
    }
  }

  /**
   * Save benchmark result to disk
   * @param result - Benchmark result to save
   * @param originalContent - Original page content
   * @param outputDir - Base output directory
   */
  private async saveResultToDisk(
    result: BenchmarkResult,
    originalContent: string,
    outputDir: string,
  ): Promise<void> {
    try {
      // Create a URL-based folder name to prevent overwriting
      const urlFolderName = this.createSafeUrlFolderName(result.url || '');

      // Create directory structure (removed index parameter and subfolder)
      const resultDir = path.join(process.cwd(), outputDir, urlFolderName, result.strategyName);

      await fs.ensureDir(resultDir);

      // Save metadata
      const metadata = {
        strategyName: result.strategyName,
        strategyDescription: result.strategyDescription,
        url: result.url,
        timestamp: new Date().toISOString(),
        executionTime: result.executionTime,
        originalLength: result.originalLength,
        extractedLength: result.extractedLength,
        tokenCount: result.tokenCount,
        peakMemoryUsage: result.peakMemoryUsage,
        metadata: result.metadata || {},
      };

      await fs.writeJson(path.join(resultDir, 'meta.json'), metadata, { spaces: 2 });

      // Save original content
      await fs.writeFile(path.join(resultDir, 'original.md'), originalContent);

      // Save extracted content
      await fs.writeFile(path.join(resultDir, 'result.md'), result.content);

      console.log(chalk.green(`    💾 Saved results to ${resultDir}`));
    } catch (error) {
      console.error('Error saving results to disk:', error);
    }
  }

  /**
   * Aggregate raw benchmark results
   * @param results - Raw benchmark results
   * @returns Aggregated results
   */
  private aggregateResults(results: BenchmarkResult[]): AggregatedBenchmarkResult[] {
    // Group results by strategy name
    const groupedResults: Record<string, BenchmarkResult[]> = {};

    results.forEach((result) => {
      if (!groupedResults[result.strategyName]) {
        groupedResults[result.strategyName] = [];
      }
      groupedResults[result.strategyName].push(result);
    });

    // Calculate aggregated statistics for each strategy
    return Object.entries(groupedResults).map(([strategyName, strategyResults]) => {
      // Calculate average execution time
      const executionTimes = strategyResults.map((r) => r.executionTime);
      const avgExecutionTime =
        executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;

      // Calculate standard deviation of execution time
      const variance =
        executionTimes.reduce((sum, time) => sum + Math.pow(time - avgExecutionTime, 2), 0) /
        executionTimes.length;
      const stdDevExecutionTime = Math.sqrt(variance);

      // Calculate min/max execution time
      const minExecutionTime = Math.min(...executionTimes);
      const maxExecutionTime = Math.max(...executionTimes);

      // Calculate average content length and token count
      const avgExtractedLength =
        strategyResults.reduce((sum, r) => sum + r.extractedLength, 0) / strategyResults.length;
      const avgTokenCount =
        strategyResults.reduce((sum, r) => sum + r.tokenCount, 0) / strategyResults.length;

      // Calculate average memory usage if available
      let avgPeakMemoryUsage;
      if (strategyResults[0].peakMemoryUsage !== undefined) {
        const memoryUsages = strategyResults.map((r) => r.peakMemoryUsage!);
        avgPeakMemoryUsage =
          memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
      }

      return {
        strategyName,
        strategyDescription: strategyResults[0].strategyDescription,
        originalLength: strategyResults[0].originalLength,
        avgExtractedLength,
        avgTokenCount,
        avgExecutionTime,
        stdDevExecutionTime,
        minExecutionTime,
        maxExecutionTime,
        avgPeakMemoryUsage,
        rawResults: strategyResults,
      };
    });
  }

  /**
   * Present benchmark results in a formatted table
   * @param results - Aggregated benchmark results to present
   */
  presentResults(results: AggregatedBenchmarkResult[]): void {
    console.log(chalk.blue.bold('\n📋 Benchmark Results'));

    // Print header for execution time statistics
    console.log(
      '\n' +
        chalk.bold(
          '┌─────────────────────┬───────────────┬───────────────┬───────────────┬───────────────┐',
        ),
    );

    console.log(
      chalk.bold(
        '│ Strategy             │ Avg Time (ms) │ Min Time (ms) │ Max Time (ms) │ Std Dev (ms)  │',
      ),
    );
    console.log(
      chalk.bold(
        '├─────────────────────┼───────────────┼───────────────┼───────────────┼───────────────┤',
      ),
    );

    // Print each result row for execution time
    results.forEach((result) => {
      const avgTime = result.avgExecutionTime.toFixed(2);
      const minTime = result.minExecutionTime.toFixed(2);
      const maxTime = result.maxExecutionTime.toFixed(2);
      const stdDev = result.stdDevExecutionTime.toFixed(2);

      console.log(
        `│ ${this.padRight(result.strategyName, 21)} │ ` +
          `${this.padLeft(avgTime, 13)} │ ` +
          `${this.padLeft(minTime, 13)} │ ` +
          `${this.padLeft(maxTime, 13)} │ ` +
          `${this.padLeft(stdDev, 13)} │`,
      );
    });

    console.log(
      chalk.bold(
        '└─────────────────────┴───────────────┴───────────────┴───────────────┴───────────────┘',
      ),
    );

    // Print header for content statistics
    console.log(
      '\n' + chalk.bold('┌─────────────────────┬───────────────┬───────────────┬───────────────┐'),
    );
    console.log(
      chalk.bold('│ Strategy             │ Original Len  │ Extracted Len │ Token Count   │'),
    );
    console.log(
      chalk.bold('├─────────────────────┼───────────────┼───────────────┼───────────────┤'),
    );

    // Print each result row for content
    results.forEach((result) => {
      const originalLen = result.originalLength.toLocaleString();

      const extractedLen = Math.round(result.avgExtractedLength).toLocaleString();
      const tokenCount = Math.round(result.avgTokenCount).toLocaleString();

      console.log(
        `│ ${this.padRight(result.strategyName, 21)} │ ` +
          `${this.padLeft(originalLen, 13)} │ ` +
          `${this.padLeft(extractedLen, 13)} │ ` +
          `${this.padLeft(tokenCount, 13)} │`,
      );
    });

    console.log(
      chalk.bold('└─────────────────────┴───────────────┴───────────────┴───────────────┘'),
    );

    // Print memory usage if available
    if (results[0].avgPeakMemoryUsage !== undefined) {
      console.log('\n' + chalk.bold('┌─────────────────────┬───────────────┐'));
      console.log(chalk.bold('│ Strategy             │ Memory (MB)   │'));
      console.log(chalk.bold('├─────────────────────┼───────────────┤'));

      results.forEach((result) => {
        const memoryUsage = result.avgPeakMemoryUsage?.toFixed(2) || 'N/A';

        console.log(
          `│ ${this.padRight(result.strategyName, 21)} │ ` + `${this.padLeft(memoryUsage, 13)} │`,
        );
      });

      console.log(chalk.bold('└─────────────────────┴───────────────┘'));
    }

    // Print compression ratios
    console.log(chalk.blue.bold('\n📉 Compression Ratios (compared to original content)'));

    console.log('\n' + chalk.bold('┌─────────────────────┬───────────────┬───────────────┐'));
    console.log(chalk.bold('│ Strategy             │ Length Ratio  │ Token Ratio   │'));
    console.log(chalk.bold('├─────────────────────┼───────────────┼───────────────┤'));

    results.forEach((result) => {
      const lengthRatio =
        ((result.avgExtractedLength / result.originalLength) * 100).toFixed(2) + '%';
      const tokenRatio = ((result.avgTokenCount / results[0].avgTokenCount) * 100).toFixed(2) + '%';

      console.log(
        `│ ${this.padRight(result.strategyName, 21)} │ ` +
          `${this.padLeft(lengthRatio, 13)} │ ` +
          `${this.padLeft(tokenRatio, 13)} │`,
      );
    });

    console.log(chalk.bold('└─────────────────────┴───────────────┴───────────────┘'));

    // Print strategy descriptions
    console.log(chalk.blue.bold('\n📝 Strategy Descriptions'));
    results.forEach((result) => {
      console.log(`\n${chalk.bold(result.strategyName)}: ${result.strategyDescription}`);
    });
  }

  /**
   * Count tokens in a string using tiktoken
   * @param text - Text to count tokens for
   * @returns Number of tokens
   */
  private countTokens(text: string): number {
    try {
      // Using cl100k_base encoding (used by GPT-4 and newer models)
      const encoding = get_encoding('cl100k_base');
      const tokens = encoding.encode(text);
      encoding.free();
      return tokens.length;
    } catch (error) {
      console.error('Error counting tokens:', error);
      return 0;
    }
  }

  /**
   * Pad string on the right to specified length
   */
  private padRight(str: string, len: number): string {
    return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
  }

  /**
   * Pad string on the left to specified length
   */
  private padLeft(str: string, len: number): string {
    return str.length >= len ? str : ' '.repeat(len - str.length) + str;
  }

  /**
   * Save summary benchmark results to disk
   * @param results - Aggregated benchmark results to save
   * @param outputDir - Base output directory
   */
  private async saveSummaryResultsToDisk(
    results: AggregatedBenchmarkResult[],
    outputDir: string,
  ): Promise<void> {
    try {
      // Get unique URLs from results
      const urls = [...new Set(results.flatMap((r) => r.rawResults.map((rr) => rr.url || '')))];

      // Create directory for each URL
      for (const url of urls) {
        const urlFolderName = this.createSafeUrlFolderName(url);

        // Create summary directory without duplicating the base path
        const summaryDir = path.join(process.cwd(), outputDir, urlFolderName, 'summary');

        await fs.ensureDir(summaryDir);

        // Filter results for this URL
        const urlResults = results
          .map((r) => ({
            ...r,
            rawResults: r.rawResults.filter((rr) => rr.url === url),
          }))
          .filter((r) => r.rawResults.length > 0);

        if (urlResults.length === 0) continue;

        // Save full JSON results
        await fs.writeJson(path.join(summaryDir, 'results.json'), urlResults, { spaces: 2 });

        // Generate formatted summary text
        let summaryText = `# Benchmark Summary Results for ${url}\n\n`;

        // Execution time statistics
        summaryText += '## Execution Time Statistics\n\n';
        summaryText +=
          '| Strategy | Avg Time (ms) | Min Time (ms) | Max Time (ms) | Std Dev (ms) |\n';
        summaryText += '|----------|--------------|--------------|--------------|-------------|\n';

        urlResults.forEach((result) => {
          const avgTime = result.avgExecutionTime.toFixed(2);
          const minTime = result.minExecutionTime.toFixed(2);
          const maxTime = result.maxExecutionTime.toFixed(2);
          const stdDev = result.stdDevExecutionTime.toFixed(2);

          summaryText += `| ${result.strategyName} | ${avgTime} | ${minTime} | ${maxTime} | ${stdDev} |\n`;
        });

        // Content statistics
        summaryText += '\n## Content Statistics\n\n';
        summaryText += '| Strategy | Original Len | Extracted Len | Token Count |\n';
        summaryText += '|----------|-------------|--------------|------------|\n';

        urlResults.forEach((result) => {
          const originalLen = result.originalLength.toLocaleString();
          const extractedLen = Math.round(result.avgExtractedLength).toLocaleString();
          const tokenCount = Math.round(result.avgTokenCount).toLocaleString();

          summaryText += `| ${result.strategyName} | ${originalLen} | ${extractedLen} | ${tokenCount} |\n`;
        });

        // Memory usage if available
        if (urlResults[0].avgPeakMemoryUsage !== undefined) {
          summaryText += '\n## Memory Usage\n\n';
          summaryText += '| Strategy | Memory (MB) |\n';
          summaryText += '|----------|------------|\n';

          urlResults.forEach((result) => {
            const memoryUsage = result.avgPeakMemoryUsage?.toFixed(2) || 'N/A';
            summaryText += `| ${result.strategyName} | ${memoryUsage} |\n`;
          });
        }

        // Compression ratios
        summaryText += '\n## Compression Ratios\n\n';
        summaryText += '| Strategy | Length Ratio | Token Ratio |\n';
        summaryText += '|----------|-------------|------------|\n';

        urlResults.forEach((result) => {
          const lengthRatio =
            ((result.avgExtractedLength / result.originalLength) * 100).toFixed(2) + '%';
          const tokenRatio =
            ((result.avgTokenCount / urlResults[0].avgTokenCount) * 100).toFixed(2) + '%';

          summaryText += `| ${result.strategyName} | ${lengthRatio} | ${tokenRatio} |\n`;
        });

        // Save the markdown summary
        await fs.writeFile(path.join(summaryDir, 'summary.md'), summaryText);

        console.log(chalk.green(`💾 Saved summary results for ${url} to ${summaryDir}`));
      }
    } catch (error) {
      console.error('Error saving summary results to disk:', error);
    }
  }

  /**
   * Create a safe folder name from a URL
   * @param url - URL to convert to a folder name
   * @returns Safe folder name
   */
  private createSafeUrlFolderName(url: string): string {
    if (!url) return 'unknown';

    // Remove protocol and replace special characters
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[/?=&]/g, '_')
      .replace(/[^a-zA-Z09_\-.]/g, '')
      .substring(0, 50); // Limit length to avoid file path issues
  }
}
