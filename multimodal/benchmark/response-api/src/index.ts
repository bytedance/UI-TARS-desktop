/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkRunner } from './benchmark-runner';
import { FCStrategy, GUIStrategy, MCPStrategy } from './strategies';
import { BenchmarkConfig } from './types';

export const MODELS = [
  {
    name: 'doubao1.6',
    modelId: 'ep-20250613182556-7z8pl',
  },
  {
    name: 'doubao1.5vl',
    modelId: 'ep-20250510145437-5sxhs',
  },
];

/**
 * Main entry point for response API benchmark
 *
 * This script tests different task strategies (GUI, FC, MCP) against both
 * response API and chat completion API to compare their performance.
 * If no model is specified, it will test all models in the MODELS array.
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm start [options]

Options:
  --save, -s              Save results to disk
  --runs=<number>         Number of runs per strategy (default: 3)
  --task=<type>          Filter by task type (gui, fc, mcp)
  --dump-history, --dump  Enable message history dumping for debugging
  --model=<model-id>      Specify model ID to use for all strategies
  --help, -h              Show this help message

Examples:
  npm start --runs=5 --save
  npm start --task=gui --dump-history
  npm start --model=ep-20250613182556-7z8pl --runs=1

Note: If no --model is specified, all models will be tested for comparison.
    `);
    process.exit(0);
  }

  const saveToDisk = args.includes('--save') || args.includes('-s');
  const runsPerStrategy = parseInt(
    args.find((arg) => arg.startsWith('--runs='))?.split('=')[1] || '3',
  );
  const taskType = args.find((arg) => arg.startsWith('--task='))?.split('=')[1];
  const dumpMessageHistory = args.includes('--dump-history') || args.includes('--dump');
  const specifiedModelId = args.find((arg) => arg.startsWith('--model='))?.split('=')[1];

  // Define strategies to test
  const allStrategies = [new FCStrategy(), new GUIStrategy(), new MCPStrategy()];
  // const allStrategies = [new GUIStrategy()];

  // Filter strategies based on task type if specified
  const strategies = taskType
    ? allStrategies.filter((s) => s.taskType === taskType)
    : allStrategies;

  if (strategies.length === 0) {
    console.error(`No strategies found for task type: ${taskType}`);
    console.error('Available task types: gui, fc, mcp');
    console.error('Use --help for more information');
    process.exit(1);
  }

  // Determine which models to test
  const modelsToTest = specifiedModelId
    ? [{ name: 'specified', modelId: specifiedModelId }]
    : MODELS;

  console.log('🚀 Starting benchmark...');
  console.log(
    `📊 Testing ${modelsToTest.length} model(s): ${modelsToTest.map((m) => m.name).join(', ')}`,
  );
  console.log(
    `🎯 Testing ${strategies.length} strategy(ies): ${strategies.map((s) => s.name).join(', ')}`,
  );

  // Initialize benchmark runner
  const benchmarkRunner = new BenchmarkRunner();

  // Collect all results across models
  const allResults: any[] = [];

  try {
    // Run benchmark for each model
    for (const model of modelsToTest) {
      console.log(`\n🤖 Testing model: ${model.name} (${model.modelId})`);

      const config: BenchmarkConfig = {
        strategies,
        runsPerStrategy,
        collectMemoryUsage: false, // Set to true if --expose-gc flag is used
        saveToDisk: false, // We'll save all results together at the end
        outputDir: 'result',
        dumpMessageHistory,
        modelId: model.modelId,
        // timeout: 300000, // 5 minutes timeout
      };

      // Run benchmark for this model
      const modelResults = await benchmarkRunner.runBenchmark(strategies, config);

      // Add model information to results
      const enhancedResults = modelResults.map((result) => ({
        ...result,
        modelName: model.name,
        modelId: model.modelId,
        strategyName: `${result.strategyName} [${model.name}]`, // Add model name to strategy name for display
      }));

      allResults.push(...enhancedResults);
    }

    // Present combined results
    console.log('\n🏆 Combined Results Across All Models');
    benchmarkRunner.presentResults(allResults);

    // Save combined results if requested
    if (saveToDisk) {
      const config: BenchmarkConfig = {
        strategies,
        runsPerStrategy,
        collectMemoryUsage: false,
        saveToDisk: true,
        outputDir: 'result',
        dumpMessageHistory,
        modelId: undefined, // Multiple models tested
      };

      // Save results with model comparison
      await benchmarkRunner.saveResultsToDisk(allResults, config.outputDir!);
      console.log(`📁 Combined results saved to: ${config.outputDir}`);
    }

    console.log('\n✅ Multi-model benchmark completed successfully!');

    if (modelsToTest.length > 1) {
      console.log(
        `📊 Tested ${modelsToTest.length} models with ${strategies.length} strategies each`,
      );
    }
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
