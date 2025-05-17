#!/usr/bin/env node
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { loadConfig } from '@multimodal/config-loader';
import { AgentTARSOptions } from '@agent-tars/core';
import { startInteractiveWebUI } from './interactive-ui';
import { startInteractiveCLI } from './interactive-cli';
import { processRequestCommand } from './request-command';

// List of config files to search for automatically
const CONFIG_FILES = [
  'agent-tars.config.ts',
  'agent-tars.config.yml',
  'agent-tars.config.yaml',
  'agent-tars.config.json',
  'agent-tars.config.js',
];

const cli = cac('tars');

// Use package.json version
cli.version(__VERSION__);
cli.help();

/**
 * Load configuration from file
 */
async function loadTarsConfig(configPath?: string): Promise<AgentTARSOptions> {
  try {
    const { content, filePath } = await loadConfig<AgentTARSOptions>({
      cwd: process.cwd(),
      path: configPath,
      configFiles: CONFIG_FILES,
    });

    if (filePath) {
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

cli
  .command('serve', 'Start Agent TARS Server.')
  .option('--port <port>', 'Port to run the server on', { default: 3000 })
  .option('--config, -c <path>', 'Path to the configuration file')
  .action(async (options = {}) => {
    const { port, config: configPath } = options;

    // Load config from file
    const userConfig = await loadTarsConfig(configPath);

    try {
      await startInteractiveWebUI({
        port: Number(port),
        uiMode: 'none',
        config: userConfig,
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });

cli
  .command('[start]', 'Run Agent TARS in interactive mode with optional UI')
  .option('--ui [mode]', 'UI mode: "interactive" (default) or "plain"', { default: false })
  .option('--port <port>', 'Port to run the server on (when using UI)', { default: 3000 })
  .option('--config, -c <path>', 'Path to the configuration file')
  .action(async (commandOptions = {}) => {
    const { ui, port, config: configPath } = commandOptions;

    const userConfig = await loadTarsConfig(configPath);

    // Handle UI modes
    if (ui) {
      const uiMode = ui === true ? 'interactive' : ui;
      if (!['interactive', 'plain'].includes(uiMode)) {
        console.error(`Invalid UI mode: ${uiMode}. Supported modes: interactive, plain`);
        process.exit(1);
      }

      try {
        await startInteractiveWebUI({
          port: Number(port),
          uiMode,
          config: userConfig,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    } else {
      // CLI interactive mode
      await startInteractiveCLI(userConfig);
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
