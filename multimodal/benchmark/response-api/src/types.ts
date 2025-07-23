/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Task types supported by the benchmark
 */
export type TaskType = 'gui' | 'fc' | 'mcp';

/**
 * API types to benchmark
 */
export type ApiType = 'chat' | 'response';

/**
 * Configuration for task strategy
 */
export interface StrategyConfig {
  /**
   * Whether to use response API instead of chat completion API
   */
  useResponseApi: boolean;

  /**
   * Whether to dump message history for debugging
   */
  dumpMessageHistory?: boolean;

  /**
   * Model ID to use for the strategy
   */
  modelId?: string;

  /** thinking mode */
  thinking?: 'disabled' | 'enabled';
}

/**
 * Task strategy interface
 * Defines the contract that all task strategies must implement
 */
export interface TaskStrategy {
  /**
   * Unique name of the strategy
   */
  readonly name: string;

  /**
   * Brief description of the strategy
   */
  readonly description: string;

  /**
   * Task type
   */
  readonly taskType: TaskType;

  /**
   * Create and configure agent for the task
   * @param config - Strategy configuration
   * @returns Promise with configured agent
   */
  createAgent(config: StrategyConfig): Promise<any>;

  /**
   * Execute the task
   * @param agent - Configured agent
   * @returns Promise with task execution result
   */
  executeTask(agent: any): Promise<TaskExecutionResult>;

  /**
   * Cleanup resources after task execution
   * @param agent - Agent to cleanup
   */
  cleanup?(agent: any): Promise<void>;
}

/**
 * Result of task execution
 */
export interface TaskExecutionResult {
  /**
   * Whether the task completed successfully
   */
  success: boolean;

  /**
   * Task output/result (optional)
   */
  result?: any;

  /**
   * Error message if task failed
   */
  error?: string;

  /**
   * Additional metadata about the execution
   */
  metadata?: Record<string, any>;
}

/**
 * Benchmark result for a single strategy run
 */
export interface BenchmarkResult extends TaskExecutionResult {
  /**
   * Strategy name that produced this result
   */
  strategyName: string;

  /**
   * Strategy description
   */
  strategyDescription: string;

  /**
   * Task type
   */
  taskType: TaskType;

  /**
   * API type used (chat or response)
   */
  apiType: ApiType;

  /**
   * Time taken for execution (ms)
   */
  executionTime: number;

  /**
   * Peak memory usage (MB) if available
   */
  peakMemoryUsage?: number;

  /**
   * Timestamp of execution
   */
  timestamp: string;
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
   * Task type
   */
  taskType: TaskType;

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
   * Success rate (0-1)
   */
  successRate: number;

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
   * Task strategies to benchmark
   */
  strategies: TaskStrategy[];

  /**
   * Number of runs per strategy
   */
  runsPerStrategy: number;

  /**
   * Whether to collect memory usage statistics
   */
  collectMemoryUsage: boolean;

  /**
   * Whether to save results to disk
   */
  saveToDisk?: boolean;

  /**
   * Output directory for saved results
   */
  outputDir?: string;

  /**
   * Timeout for each task execution (ms)
   */
  timeout?: number;

  /**
   * Whether to dump message history for debugging
   */
  dumpMessageHistory?: boolean;

  /**
   * Model ID to use for all strategies
   */
  modelId?: string;
}
