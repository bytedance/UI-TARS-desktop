/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'cac';
import path from 'path';
import { AgentTARSOptions, LogLevel, BrowserControlMode } from '@agent-tars/core';
import { mergeCommandLineOptions, logger } from './utils';
import { loadTarsConfig } from './config-loader';

export const DEFAULT_PORT = 8888;

/**
 * Common interface for command options
 * Used to define the shape of options shared between CLI commands
 */
export interface CommonCommandOptions {
  port?: number;
  config?: string;
  logLevel?: string;
  debug?: boolean;
  quiet?: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  stream?: boolean;
  thinking?: boolean;
  pe?: boolean;
  workspace?: string;
  browserControl?: string;
  planner?: boolean;
  shareProvider?: string;
  enableSnapshot?: boolean;
  snapshotPath?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Helper to convert string log level to enum
 */
export function parseLogLevel(level?: string): LogLevel | undefined {
  if (!level) return undefined;

  const upperLevel = level.toUpperCase();
  if (upperLevel === 'DEBUG') return LogLevel.DEBUG;
  if (upperLevel === 'INFO') return LogLevel.INFO;
  if (upperLevel === 'WARN' || upperLevel === 'WARNING') return LogLevel.WARN;
  if (upperLevel === 'ERROR') return LogLevel.ERROR;

  console.warn(`Unknown log level: ${level}, using default log level`);
  return undefined;
}

/**
 * Add common options to a command
 * Centralizes option definitions to ensure consistency across commands
 */
export function addCommonOptions(command: Command): Command {
  return command
    .option('--port <port>', 'Port to run the server on', { default: DEFAULT_PORT })
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
    .option(
      '--browser-control [mode]',
      'Browser control mode (default, browser-use-only, gui-agent-only)',
    )
    .option('--planner', 'Enable planning functionality for complex tasks')
    .option('--share-provider', 'Share provider information')
    .option('--enable-snapshot', 'Enable agent snapshot functionality')
    .option('--snapshot-path <path>', 'Path for storing agent snapshots')
    .option('--port <port>', 'Port to run the server on', { default: DEFAULT_PORT });
}

/**
 * Process common command options and prepare configuration
 * Handles option parsing, config loading, and merging for reuse across commands
 */
export async function processCommonOptions(options: CommonCommandOptions): Promise<{
  mergedConfig: AgentTARSOptions;
  isDebug: boolean;
  snapshotConfig?: { enable: boolean; snapshotPath: string };
}> {
  const {
    config: configPath,
    logLevel,
    debug,
    quiet,
    workspace,
    enableSnapshot,
    snapshotPath,
  } = options;

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

  // Browser control mode
  if (options.browserControl && typeof options.browserControl === 'string') {
    if (!mergedConfig.browser) mergedConfig.browser = {};
    mergedConfig.browser.control = options.browserControl as BrowserControlMode;
  }

  if (mergedConfig.logLevel) logger.setLevel(mergedConfig.logLevel);

  logger.info('cli config merged with default config');

  // Create snapshot config if enabled
  const snapshotConfig = enableSnapshot
    ? {
        enable: true,
        snapshotPath:
          snapshotPath || path.join(process.cwd(), 'agent-snapshots', `snapshot-${Date.now()}`),
      }
    : undefined;

  return { mergedConfig, isDebug, snapshotConfig };
}
