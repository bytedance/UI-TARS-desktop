/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

import {
  TaskStrategy,
  BenchmarkResult,
  AggregatedBenchmarkResult,
  BenchmarkConfig,
  ApiType,
  StrategyConfig,
} from './types';

/**
 * BenchmarkRunner - Executes benchmark tests for response API vs chat completion
 *
 * This class is responsible for:
 * 1. Running benchmarks for different task strategies (GUI, FC, MCP)
 * 2. Measuring performance metrics (execution time only)
 * 3. Generating and presenting benchmark results in a readable format
 * 4. Saving results to disk for further analysis
 */
export class BenchmarkRunner {
  private defaultConfig: BenchmarkConfig = {
    strategies: [],
    runsPerStrategy: 3,
    collectMemoryUsage: false,
    saveToDisk: false,
    outputDir: 'results',
    timeout: 300000, // 5 minutes default timeout
  };

  /**
   * Run benchmark for all provided strategies
   * @param strategies - List of task strategies to benchmark
   * @param config - Benchmark configuration
   * @returns Promise with aggregated benchmark results
   */
  async runBenchmark(
    strategies: TaskStrategy[],
    config?: Partial<BenchmarkConfig>,
  ): Promise<AggregatedBenchmarkResult[]> {
    // Merge config with defaults
    const finalConfig: BenchmarkConfig = {
      ...this.defaultConfig,
      strategies,
      ...config,
    };

    console.log(chalk.blue.bold('\n📊 Response API vs Chat Completion Benchmark'));
    console.log(chalk.blue(`🔄 Runs per strategy: ${finalConfig.runsPerStrategy}`));
    console.log(chalk.blue(`🎯 Strategies to test: ${strategies.length}`));
    if (finalConfig.saveToDisk) {
      console.log(chalk.blue(`💾 Saving results to: ${finalConfig.outputDir}`));
    }
    console.log(chalk.blue('⏳ Running benchmarks...\n'));

    const allResults: BenchmarkResult[] = [];

    // For each strategy
    for (const strategy of strategies) {
      console.log(chalk.cyan.bold(`\nTesting Strategy: ${strategy.name} (${strategy.taskType})`));
      console.log(chalk.cyan(`Description: ${strategy.description}`));

      // Test both API types
      for (const apiType of ['response', 'chat'] as ApiType[]) {
        // doubao 1.5 does not support responses api
        if (config.modelId === 'ep-20250510145437-5sxhs' && apiType === 'response') {
          continue;
        }

        console.log(chalk.yellow(`\n  Testing ${apiType} API...`));

        const strategyResults: BenchmarkResult[] = [];

        for (let run = 1; run <= finalConfig.runsPerStrategy; run++) {
          console.log(chalk.yellow(`    Run ${run}/${finalConfig.runsPerStrategy}...`));

          // Capture memory usage if enabled
          let startMemory, endMemory;
          if (finalConfig.collectMemoryUsage && global.gc) {
            global.gc(); // Force garbage collection before measurement
            startMemory = process.memoryUsage();
          }

          const startTime = performance.now();
          let taskResult;
          let agent;

          try {
            // Create agent with specified API type and configuration
            const strategyConfig: StrategyConfig = {
              useResponseApi: apiType === 'response',
              dumpMessageHistory: finalConfig.dumpMessageHistory,
              modelId: finalConfig.modelId,
            };
            agent = await strategy.createAgent(strategyConfig);

            // Execute task with timeout
            taskResult = (await Promise.race([
              strategy.executeTask(agent),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Task timeout')), finalConfig.timeout!),
              ),
            ])) as any;
          } catch (error) {
            taskResult = {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          } finally {
            // Cleanup agent
            if (agent && strategy.cleanup) {
              try {
                await strategy.cleanup(agent);
              } catch (cleanupError) {
                console.warn('Cleanup error:', cleanupError);
              }
            }
          }

          const endTime = performance.now();

          if (finalConfig.collectMemoryUsage && global.gc) {
            global.gc(); // Force garbage collection before measurement
            endMemory = process.memoryUsage();
          }

          const executionTime = Number((endTime - startTime).toFixed(2));

          const result: BenchmarkResult = {
            ...taskResult,
            strategyName: strategy.name,
            strategyDescription: strategy.description,
            taskType: strategy.taskType,
            apiType,
            executionTime,
            timestamp: new Date().toISOString(),
          };

          // Add memory usage if available
          if (startMemory && endMemory) {
            result.peakMemoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024); // MB
          }

          strategyResults.push(result);
          allResults.push(result);

          const status = result.success ? '✓' : '✗';
          const statusColor = result.success ? chalk.green : chalk.red;
          console.log(statusColor(`      ${status} Completed in ${executionTime.toFixed(2)}ms`));
        }
      }
    }

    // Aggregate results
    const aggregatedResults = this.aggregateResults(allResults);

    // Save results to disk if enabled
    if (finalConfig.saveToDisk) {
      await this.saveResultsToDisk(aggregatedResults, finalConfig.outputDir!);
    }

    return aggregatedResults;
  }

  /**
   * Aggregate raw benchmark results
   * @param results - Raw benchmark results
   * @returns Aggregated results
   */
  private aggregateResults(results: BenchmarkResult[]): AggregatedBenchmarkResult[] {
    // Group results by strategy name and API type
    const groupedResults: Record<string, BenchmarkResult[]> = {};

    results.forEach((result) => {
      const key = `${result.strategyName}_${result.apiType}`;
      if (!groupedResults[key]) {
        groupedResults[key] = [];
      }
      groupedResults[key].push(result);
    });

    // Calculate aggregated statistics for each group
    return Object.entries(groupedResults).map(([key, groupResults]) => {
      // Calculate average execution time
      const executionTimes = groupResults.map((r) => r.executionTime);
      const avgExecutionTime = Number(
        (executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length).toFixed(2),
      );

      // Calculate standard deviation of execution time
      const variance =
        executionTimes.reduce((sum, time) => sum + Math.pow(time - avgExecutionTime, 2), 0) /
        executionTimes.length;
      const stdDevExecutionTime = Number(Math.sqrt(variance).toFixed(2));

      // Calculate min/max execution time
      const minExecutionTime = Math.min(...executionTimes);
      const maxExecutionTime = Math.max(...executionTimes);

      // Calculate success rate
      const successCount = groupResults.filter((r) => r.success).length;
      const successRate = successCount / groupResults.length;

      // Calculate average memory usage if available
      let avgPeakMemoryUsage;
      if (groupResults[0].peakMemoryUsage !== undefined) {
        const memoryUsages = groupResults.map((r) => r.peakMemoryUsage!);
        avgPeakMemoryUsage =
          memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;
      }

      return {
        strategyName: `${groupResults[0].strategyName} (${groupResults[0].apiType})`,
        strategyDescription: groupResults[0].strategyDescription,
        taskType: groupResults[0].taskType,
        avgExecutionTime,
        stdDevExecutionTime,
        minExecutionTime,
        maxExecutionTime,
        avgPeakMemoryUsage,
        successRate,
        rawResults: groupResults,
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
          '┌─────────────────────────────┬───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐',
        ),
    );

    console.log(
      chalk.bold(
        '│ Strategy (API)              │ Avg Time (s) │ Min Time (s) │ Max Time (s) │ Std Dev (s)  │ Success Rate  │',
      ),
    );
    console.log(
      chalk.bold(
        '├─────────────────────────────┼───────────────┼───────────────┼───────────────┼───────────────┼───────────────┤',
      ),
    );

    // Print each result row for execution time
    results.forEach((result) => {
      const avgTime = (result.avgExecutionTime / 1000).toFixed(2);
      const minTime = (result.minExecutionTime / 1000).toFixed(2);
      const maxTime = (result.maxExecutionTime / 1000).toFixed(2);
      const stdDev = (result.stdDevExecutionTime / 1000).toFixed(2);
      const successRate = (result.successRate * 100).toFixed(1) + '%';

      console.log(
        `│ ${this.padRight(result.strategyName, 27)} │ ` +
          `${this.padLeft(avgTime, 13)} │ ` +
          `${this.padLeft(minTime, 13)} │ ` +
          `${this.padLeft(maxTime, 13)} │ ` +
          `${this.padLeft(stdDev, 13)} │ ` +
          `${this.padLeft(successRate, 13)} │`,
      );
    });

    console.log(
      chalk.bold(
        '└─────────────────────────────┴───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘',
      ),
    );

    // Print memory usage if available
    if (results[0].avgPeakMemoryUsage !== undefined) {
      console.log('\n' + chalk.bold('┌─────────────────────────────┬───────────────┐'));
      console.log(chalk.bold('│ Strategy (API)              │ Memory (MB)   │'));
      console.log(chalk.bold('├─────────────────────────────┼───────────────┤'));

      results.forEach((result) => {
        const memoryUsage = result.avgPeakMemoryUsage?.toFixed(2) || 'N/A';

        console.log(
          `│ ${this.padRight(result.strategyName, 27)} │ ` + `${this.padLeft(memoryUsage, 13)} │`,
        );
      });

      console.log(chalk.bold('└─────────────────────────────┴───────────────┘'));
    }

    // Print strategy descriptions
    console.log(chalk.blue.bold('\n📝 Strategy Descriptions'));
    results.forEach((result) => {
      console.log(`\n${chalk.bold(result.strategyName)}: ${result.strategyDescription}`);
    });
  }

  /**
   * Save benchmark results to disk
   * @param results - Aggregated benchmark results to save
   * @param outputDir - Base output directory
   */
  public async saveResultsToDisk(
    results: AggregatedBenchmarkResult[],
    outputDir: string,
  ): Promise<void> {
    try {
      const resultDir = path.join(process.cwd(), outputDir);
      await fs.ensureDir(resultDir);

      // Save full JSON results
      await fs.writeJson(path.join(resultDir, 'benchmark-results.json'), results, { spaces: 2 });

      // Generate formatted summary text
      let summaryText = `# Response API vs Chat Completion Benchmark Results\n\n`;
      summaryText += `Generated at: ${new Date().toISOString()}\n\n`;

      // Execution time statistics
      summaryText += '## Execution Time Statistics\n\n';
      summaryText +=
        '| Strategy (API) | Avg Time (s) | Min Time (s) | Max Time (s) | Std Dev (s) | Success Rate |\n';
      summaryText +=
        '|----------------|---------------|---------------|---------------|--------------|-------------|\n';

      results.forEach((result) => {
        const avgTime = (result.avgExecutionTime / 1000).toFixed(2);
        const minTime = (result.minExecutionTime / 1000).toFixed(2);
        const maxTime = (result.maxExecutionTime / 1000).toFixed(2);
        const stdDev = (result.stdDevExecutionTime / 1000).toFixed(2);
        const successRate = (result.successRate * 100).toFixed(1) + '%';

        summaryText += `| ${result.strategyName} | ${avgTime} | ${minTime} | ${maxTime} | ${stdDev} | ${successRate} |\n`;
      });

      // Memory usage if available
      if (results[0].avgPeakMemoryUsage !== undefined) {
        summaryText += '\n## Memory Usage\n\n';
        summaryText += '| Strategy (API) | Memory (MB) |\n';
        summaryText += '|----------------|------------|\n';

        results.forEach((result) => {
          const memoryUsage = result.avgPeakMemoryUsage?.toFixed(2) || 'N/A';
          summaryText += `| ${result.strategyName} | ${memoryUsage} |\n`;
        });
      }

      // Strategy descriptions
      summaryText += '\n## Strategy Descriptions\n\n';
      results.forEach((result) => {
        summaryText += `**${result.strategyName}**: ${result.strategyDescription}\n\n`;
      });

      // Save the markdown summary
      await fs.writeFile(path.join(resultDir, 'summary.md'), summaryText);

      console.log(chalk.green(`💾 Saved benchmark results to ${resultDir}`));
    } catch (error) {
      console.error('Error saving results to disk:', error);
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
}
