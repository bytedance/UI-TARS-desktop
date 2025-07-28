/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac, { CAC } from 'cac';
import {
  AgentAppConfig,
  AgentCLIArguments,
  AgentConstructor,
} from '@multimodal/agent-server-interface';
import { addCommonOptions, processCommonOptions } from './commands/options';
import { setBootstrapCliOptions, getBootstrapCliOptions, BootstrapCliOptions } from './state';
import { startHeadlessServer } from './headless-server';
import { printWelcomeLogo } from '../utils';
import { startInteractiveWebUI } from './interactive-ui';
import { processRequestCommand } from './request';
import { buildConfigPaths } from '../config/paths';

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
    this.registerCommands(cli);

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
    this.hregisterWorkspaceCommand(cli);
  }

  /**
   * Register the 'serve' command
   */
  registerServeCommand(cli: CAC): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    // Use the common options function to add shared options
    addCommonOptions(serveCommand).action(async (options: AgentCLIArguments = {}) => {
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
      async (_, options: AgentCLIArguments = {}) => {
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

  /**
   * Process common command options and prepare configuration
   * Handles option parsing, config loading, and merging for reuse across commands
   */
  processCommonOptions(options: AgentCLIArguments): Promise<{
    appConfig: AgentAppConfig;
    isDebug: boolean;
    agentConstructor: AgentConstructor;
    agentName: string;
  }> {
    const bootstrapCliOptions = getBootstrapCliOptions();
    const isDebug = !!options.debug;

    // Build configuration paths using the extracted function
    const configPaths = buildConfigPaths({
      cliConfigPaths: options.config,
      bootstrapRemoteConfig: bootstrapCliOptions.remoteConfig,
      useGlobalWorkspace: shouldUseGlobalWorkspace,
      globalWorkspacePath: shouldUseGlobalWorkspace ? getGlobalWorkspacePath() : undefined,
      isDebug,
    });

    // Load user config from file
    const userConfig = await loadTarsConfig(configPaths, isDebug);

    // Build complete application configuration
    const appConfig = ConfigBuilder.buildAppConfig(options, userConfig);

    // Set logger level if specified
    if (appConfig.logLevel) {
      logger.setLevel(appConfig.logLevel);
    }

    // If global workspace exists, is enabled, and no workspace directory was explicitly specified, use global workspace
    if (shouldUseGlobalWorkspace && !appConfig.workspace?.workingDirectory) {
      if (!appConfig.workspace) {
        appConfig.workspace = {};
      }
      appConfig.workspace.workingDirectory = getGlobalWorkspacePath();
      logger.debug(`Using global workspace directory: ${appConfig.workspace.workingDirectory}`);
    }

    // Resolve agent constructor
    const { agentConstructor, agentName } = await resolveAgentConstructor(options.agent);

    logger.debug(`Using agent: ${agentName}`);
    logger.debug('Application configuration built from CLI and config files');

    return { appConfig, isDebug, agentConstructor, agentName };
  }
}
