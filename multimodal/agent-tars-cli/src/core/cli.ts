/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac, { CAC } from 'cac';
import { registerCommands } from './commands';
import { addCommonOptions, processCommonOptions } from './commands/options';
import { setBootstrapCliOptions, getBootstrapCliOptions, BootstrapCliOptions } from './state';
import { startHeadlessServer } from './headless-server';
import { printWelcomeLogo } from '../utils';
import { startInteractiveWebUI } from './interactive-ui';
import { processRequestCommand } from './request';

export class AgentCLI {
  /**
   * Bootstrap Agent CLI.
   */
  bootstrap(options: BootstrapCliOptions) {
    const { version, binName } = options;

    // Set bootstrap cli options with build time and git hash
    setBootstrapCliOptions({
      ...options,
      version,
      buildTime: __BUILD_TIME__,
      gitHash: __GIT_HASH__,
    });

    // Create CLI with custom styling
    const cli = cac(binName ?? 'tars');

    // Use package.json version
    cli.version(version);

    // Show logo on help command
    cli.help(() => {
      // Print logo before help content
      printWelcomeLogo(version);
    });

    // Register all commands
    registerCommands(cli);

    // Parse command line arguments
    cli.parse();
  }

  /**
   * Register all CLI commands
   */
  registerCommands(cli: CAC): void {
    this.registerServeCommand(cli);
    this.registerInteractiveUICommand(cli);
    this.registerRequestCommand(cli);
    this.registerRunCommand(cli);
    registerWorkspaceCommand(cli);
  }

  /**
   * Register the 'serve' command
   */
  registerServeCommand(cli: CAC): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    // Use the common options function to add shared options
    addCommonOptions(serveCommand).action(async (options: ExtendedCLIArguments = {}) => {
      printWelcomeLogo(getBootstrapCliOptions().version!);

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await processCommonOptions(options);
        await startHeadlessServer({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Register the interactive UI command
   */
  registerInteractiveUICommand(cli: CAC): void {
    const interactiveUIStartCommand = cli.command('[start]', 'Run Agent in interactive UI');

    // Use the common options function to add shared options
    addCommonOptions(interactiveUIStartCommand).action(
      async (_, options: ExtendedCLIArguments = {}) => {
        printWelcomeLogo(getBootstrapCliOptions().version!);

        try {
          const { appConfig, isDebug, agentConstructor, agentName } =
            await processCommonOptions(options);

          await startInteractiveWebUI({
            appConfig,
            isDebug,
            agentConstructor,
            agentName,
          });
        } catch (err) {
          console.error('Failed to start server:', err);
          process.exit(1);
        }
      },
    );
  }

  /**
   * Register the 'request' command
   */
  registerRequestCommand(cli: CAC): void {
    cli
      .command('request', 'Send a direct request to an model provider')
      .option('--provider <provider>', 'LLM provider name (required)')
      .option('--model <model>', 'Model name (required)')
      .option('--body <body>', 'Path to request body JSON file or JSON string (required)')
      .option('--apiKey [apiKey]', 'Custom API key')
      .option('--baseURL [baseURL]', 'Custom base URL')
      .option('--stream', 'Enable streaming mode')
      .option('--thinking', 'Enable reasoning mode')
      .option('--format [format]', 'Output format: "raw" (default) or "semantic"', {
        default: 'raw',
      })
      .action(async (options = {}) => {
        try {
          await processRequestCommand(options);
        } catch (err) {
          console.error('Failed to process request:', err);
          process.exit(1);
        }
      });
  }
}
