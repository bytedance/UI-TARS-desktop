#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { cac } from 'cac';
import { startInteractiveCLI } from './interactive-cli';
import fs from 'fs';
import path from 'path';
import { CodeActAgent, CodeActAgentOptions } from '..';
import chalk from 'chalk';
import { mergeCommandLineOptions } from './utils';

// List of config files to search for automatically
const CONFIG_FILES = ['codeact.config.js', 'codeact.config.ts', 'codeact.config.json'];

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<CodeActAgentOptions> {
  // If specific config path provided, try to load it
  if (configPath) {
    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Config file not found: ${resolvedPath}`);
        return {};
      }

      const config = require(resolvedPath);
      return config.default || config;
    } catch (err) {
      console.error(
        `Failed to load configuration: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {};
    }
  }

  // Otherwise search for config files
  for (const filename of CONFIG_FILES) {
    try {
      const filePath = path.resolve(process.cwd(), filename);
      if (fs.existsSync(filePath)) {
        const config = require(filePath);
        console.log(`Loaded config from: ${filePath}`);
        return config.default || config;
      }
    } catch (err) {
      // Continue to next config file
    }
  }

  // No config file found
  return {};
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  console.error(chalk.red(`\n❌ Uncaught Exception: ${err.message}`));
  console.error(chalk.gray(err.stack || ''));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(
    chalk.red(
      `\n❌ Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
    ),
  );
  if (reason instanceof Error && reason.stack) {
    console.error(chalk.gray(reason.stack));
  }
  process.exit(1);
});

// Create CLI
const cli = cac('codeact');

// Version from package.json or default
try {
  const packageJson = require('../../package.json');
  cli.version(packageJson.version);
} catch (err) {
  cli.version('0.1.0');
}

cli.help();

// Main command
cli
  .command('[start]', 'Start CodeAct CLI in interactive mode')
  .option('--config, -c <path>', 'Path to configuration file')
  .option('--workspace <path>', 'Path to workspace directory')
  .option('--node-only', 'Enable only Node.js execution')
  .option('--python-only', 'Enable only Python execution')
  .option('--shell-only', 'Enable only Shell execution')
  .option('--cleanup', 'Automatic cleanup on exit')
  .option('--debug', 'Enable debug mode (show detailed execution info)')
  .option('--provider [provider]', 'LLM provider name')
  .option('--model [model]', 'Model name')
  .option('--apiKey [apiKey]', 'Custom API key')
  .option('--baseURL [baseURL]', 'Custom base URL')
  .option('--stream', 'Enable streaming mode for LLM responses')
  .option('--thinking', 'Enable reasoning mode for compatible models')
  .option('--pe', 'Use prompt engineering for tool calls instead of native function calling')
  .action(async (_, options) => {
    try {
      const { config: configPath, workspace, debug } = options;

      // Load config from file
      const fileConfig = await loadConfig(configPath);

      // Override with command line options
      const mergedConfig: CodeActAgentOptions = {
        ...fileConfig,
        workspace: workspace || fileConfig.workspace,
        cleanupOnExit: options.cleanup !== undefined ? options.cleanup : fileConfig.cleanupOnExit,
        printToConsole: true, // 总是启用打印
      };

      // Merge command line model options with loaded config
      const modelConfig = mergeCommandLineOptions(mergedConfig, options);

      console.log(chalk.cyan('\nStarting CodeAct CLI...'));
      console.log(
        chalk.dim('For multiline input, content will be folded into a single line.\n') +
          chalk.cyan('To submit your input: ') +
          chalk.yellow.bold('Press Enter') +
          '\n',
      );
      // Handle language options
      if (options.nodeOnly) {
        modelConfig.enableNodeCodeAct = true;
        modelConfig.enablePythonCodeAct = false;
        modelConfig.enableShellCodeAct = false;
      } else if (options.pythonOnly) {
        modelConfig.enableNodeCodeAct = false;
        modelConfig.enablePythonCodeAct = true;
        modelConfig.enableShellCodeAct = false;
      } else if (options.shellOnly) {
        modelConfig.enableNodeCodeAct = false;
        modelConfig.enablePythonCodeAct = false;
        modelConfig.enableShellCodeAct = true;
      }

      // Start interactive CLI
      await startInteractiveCLI(modelConfig, Boolean(debug));
    } catch (error) {
      console.error(
        chalk.red(
          `\n❌ Failed to start CodeAct CLI: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      if (error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Parse command line arguments
cli.parse();
