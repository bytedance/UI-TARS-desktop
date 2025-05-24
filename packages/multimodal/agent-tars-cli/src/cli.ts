#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { loadConfig } from '@multimodal/config-loader';
import { AgentTARSOptions, LogLevel } from '@agent-tars/core';
import { startInteractiveWebUI } from './interactive-ui';
import { startInteractiveCLI } from './interactive-cli';
import { processRequestCommand } from './request-command';
import { mergeCommandLineOptions } from './utils';

// List of config files to search for automatically
const CONFIG_FILES = [
  'agent-tars.config.ts',
  'agent-tars.config.yml',
  'agent-tars.config.yaml',
  'agent-tars.config.json',
  'agent-tars.config.js',
];

// Helper to convert string log level to enum
function parseLogLevel(level?: string): LogLevel | undefined {
  if (!level) return undefined;

  const upperLevel = level.toUpperCase();
  if (upperLevel === 'DEBUG') return LogLevel.DEBUG;
  if (upperLevel === 'INFO') return LogLevel.INFO;
  if (upperLevel === 'WARN' || upperLevel === 'WARNING') return LogLevel.WARN;
  if (upperLevel === 'ERROR') return LogLevel.ERROR;

  console.warn(`Unknown log level: ${level}, using default log level`);
  return undefined;
}

// Create CLI with custom styling
const cli = cac('tars');

// Use package.json version
cli.version(__VERSION__);
cli.help();

/**
 * Load configuration from file
 */

async function loadTarsConfig(configPath?: string, isDebug = false): Promise<AgentTARSOptions> {
  try {
    const { content, filePath } = await loadConfig<AgentTARSOptions>({
      cwd: process.cwd(),
      path: configPath,
      configFiles: CONFIG_FILES,
    });

    if (filePath && isDebug) {
      console.log(`Loaded config from: ${filePath}`);
    }

    return content;
  } catch (err) {
    console.error(
      `Failed to load configuration: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {};
  }
}

// Define CLI commands with improved descriptions
cli
  .command('serve', 'Start Agent TARS Server.')
  .option('--port <port>', 'Port to run the server on', { default: 3000 })
  .option('--config, -c <path>', 'Path to the configuration file')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)')
  .option('--debug', 'Enable debug mode (show tool calls and system events), highest priority')
  .option('--quiet', 'Reduce startup logging to minimum')
  .option('--provider [provider]', 'LLM provider name')
  .option('--model [model]', 'Model name')
  .option('--apiKey [apiKey]', 'Custom API key')
  .option('--baseURL [baseURL]', 'Custom base URL')
  .option('--stream', 'Enable streaming mode for LLM responses')
  .option('--thinking', 'Enable reasoning mode for compatible models')
  .option('--pe', 'Use prompt engineering for tool calls instead of native function calling')
  .option('--workspace <path>', 'Path to workspace directory')
  .action(async (options = {}) => {
    const { port, config: configPath, logLevel, debug, quiet, workspace } = options;

    // Set debug mode flag
    const isDebug = !!debug;

    // Load config from file
    const userConfig = await loadTarsConfig(configPath, isDebug);

    // Set log level if provided
    if (logLevel) {
      userConfig.logLevel = parseLogLevel(logLevel);
    }

    // Set quiet mode if requested
    if (quiet) {
      userConfig.logLevel = LogLevel.SILENT;
    }

    // Set debug mode if requested
    if (isDebug) {
      userConfig.logLevel = LogLevel.DEBUG;
    }

    // Set workspace path if provided
    if (workspace) {
      if (!userConfig.workspace) userConfig.workspace = {};
      userConfig.workspace.workingDirectory = workspace;
    }

    // Merge command line model options with loaded config
    const mergedConfig = mergeCommandLineOptions(userConfig, options);

    try {
      await startInteractiveWebUI({
        port: Number(port),
        uiMode: 'none',
        config: mergedConfig,
        workspacePath: workspace,
        isDebug,
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });

cli
  .command('[start]', 'Run Agent TARS in interactive mode with optional UI')

  .option('--ui', 'Enable web-based UI', { default: false })
  .option('--port <port>', 'Port to run the server on (when using UI)', { default: 3000 })
  .option('--config, -c <path>', 'Path to the configuration file')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)')
  .option('--debug', 'Enable debug mode (show tool calls and system events), highest priority')
  .option('--quiet', 'Reduce startup logging to minimum')
  .option('--provider [provider]', 'LLM provider name')
  .option('--model [model]', 'Model name')
  .option('--apiKey [apiKey]', 'Custom API key')
  .option('--baseURL [baseURL]', 'Custom base URL')
  .option('--stream', 'Enable streaming mode for LLM responses')
  .option('--thinking', 'Enable reasoning mode for compatible models')
  .option('--pe', 'Use prompt engineering for tool calls instead of native function calling')
  .option('--workspace <path>', 'Path to workspace directory')
  .action(async (command, commandOptions = {}) => {
    const { ui, port, config: configPath, logLevel, debug, quiet, workspace } = commandOptions;

    const isDebug = !!debug;

    const userConfig = await loadTarsConfig(configPath, isDebug);

    // Set log level if provided
    if (logLevel) {
      userConfig.logLevel = parseLogLevel(logLevel);
    }

    // Set quiet mode if requested
    if (quiet) {
      userConfig.logLevel = LogLevel.SILENT;
    }

    // Set debug mode if requested
    if (isDebug) {
      userConfig.logLevel = LogLevel.DEBUG;
    }

    // Set workspace path if provided
    if (workspace) {
      if (!userConfig.workspace) userConfig.workspace = {};
      userConfig.workspace.workingDirectory = workspace;
    }

    // Merge command line model options with loaded config
    const mergedConfig = mergeCommandLineOptions(userConfig, commandOptions);

    // Handle UI modes
    if (ui) {
      try {
        await startInteractiveWebUI({
          port: Number(port),

          uiMode: 'interactive',
          config: mergedConfig,
          workspacePath: workspace,
          isDebug,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    } else {
      // CLI interactive mode

      await startInteractiveCLI(mergedConfig, isDebug);
    }
  });

cli
  .command('request', 'Send a direct request to an LLM provider')
  .option('--provider <provider>', 'LLM provider name (required)')
  .option('--model <model>', 'Model name (required)')
  .option('--body <body>', 'Path to request body JSON file or JSON string (required)')
  .option('--apiKey [apiKey]', 'Custom API key')
  .option('--baseURL [baseURL]', 'Custom base URL')
  .option('--stream', 'Enable streaming mode')
  .option('--thinking', 'Enable reasoning mode')
  .option('--format [format]', 'Output format: "raw" (default) or "semantic"', { default: 'raw' })
  .action(async (options = {}) => {
    try {
      await processRequestCommand(options);
    } catch (err) {
      console.error('Failed to process request:', err);
      process.exit(1);
    }
  });

// Parse command line arguments
cli.parse();
