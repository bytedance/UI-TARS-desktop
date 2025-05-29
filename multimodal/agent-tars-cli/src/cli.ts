#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { loadConfig } from '@multimodal/config-loader';
import { AgentTARSOptions, LogLevel, getLogger } from '@agent-tars/core';
import { startInteractiveWebUI } from './interactive-ui';
import { processRequestCommand } from './request-command';
import { mergeCommandLineOptions, logger } from './utils';
import chalk from 'chalk';

// Display ASCII art LOGO
function printWelcomeLogo(): void {
  console.log('');

  // ASCII art logo with enhanced TARS visibility
  const asciiLogo = [
    '  █████   ██████  ███████ ███    ██ ████████',
    ' ██   ██ ██       ██      ████   ██    ██   ',
    ' ███████ ██   ███ █████   ██ ██  ██    ██   ',
    ' ██   ██ ██    ██ ██      ██  ██ ██    ██   ',
    ' ██   ██  ██████  ███████ ██   ████    ██   ',
    '                                     ',
    '████████  █████  ██████   ███████ ',
    '   ██    ██   ██ ██   ██  ██      ',
    '   ██    ███████ ██████   ███████ ',
    '   ██    ██   ██ ██   ██       ██ ',
    '   ██    ██   ██ ██   ██  ███████ ',
  ];

  // Use more harmonious color scheme - blue for AGENT and a more subtle shade for TARS
  const agentColor = '#4d9de0';

  const tarsColor = '#7289da'; // Changed from bright orange to a more subtle blue-purple

  asciiLogo.forEach((line, index) => {
    if (index < 6) {
      // AGENT part - blue
      console.log(chalk.hex(agentColor)(line));
    } else {
      // TARS part - more subtle color
      console.log(chalk.hex(tarsColor)(line));
    }
  });

  console.log();
  console.log(chalk.dim(`Agent TARS CLI v${__VERSION__ || '0.0.0'}`));
  console.log();
}

// Display LOGO immediately at program entry
printWelcomeLogo();

// List of config files to search for automatically
const CONFIG_FILES = [
  'agent-tars.config.ts',
  'agent-tars.config.yml',
  'agent-tars.config.yaml',
  'agent-tars.config.json',
  'agent-tars.config.js',
];

const DEFAULT_PORT = 8888;

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
    { default: 'default' },
  )
  .option('--planner', 'Enable planning functionality for complex tasks')
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

    // Browser control mode
    if (options.browserControl && typeof options.browserControl === 'string') {
      if (!userConfig.browser) userConfig.browser = {};
      userConfig.browser.control = options.browserControl;
    }

    if (mergedConfig.logLevel) logger.setLevel(mergedConfig.logLevel);

    logger.info('cli config merged with default config'), mergedConfig;

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
  .option('--ui', 'Enable web-based UI', { default: true })
  .option('--port <port>', 'Port to run the server on (when using UI)', { default: DEFAULT_PORT })
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
    'Browser control mode (mixed, browser-use-only, gui-agent-only)',
    { default: 'mixed' },
  )
  .option('--planner', 'Enable planning functionality for complex tasks')
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

    if (mergedConfig.logLevel) logger.setLevel(mergedConfig.logLevel);

    logger.info('cli config merged with default config'), mergedConfig;

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
