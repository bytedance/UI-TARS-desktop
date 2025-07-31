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
import { addCommonOptions, resolveAgentConstructor } from './options';
import { setBootstrapCliOptions, getBootstrapCliOptions, BootstrapCliOptions } from './state';
import { startHeadlessServer } from './headless-server';
import { logger, printWelcomeLogo } from '../utils';
import { startInteractiveWebUI } from './interactive-ui';
import { processRequestCommand } from './request';
import { buildConfigPaths } from '../config/paths';
import { getGlobalWorkspacePath, shouldUseGlobalWorkspace } from './workspace';
import { readFromStdin } from './stdin';
import { registerWorkspaceCommand } from './workspace';
import { processServerRun } from './server-run';
import { processSilentRun } from './run';
import { ConfigBuilder, loadTarsConfig } from '../config';

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
    registerWorkspaceCommand(cli);
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
          await this.processCommonOptions(options);
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
            await this.processCommonOptions(options);

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
   * Register the 'run' command for silent execution
   */
  registerRunCommand(cli: CAC): void {
    const runCommand = cli.command('run', 'Run Agent in silent mode and output results to stdout');

    runCommand
      .option('--input [...query]', 'Input query to process (can be omitted when using pipe)')
      .option('--format [format]', 'Output format: "json" or "text" (default: "text")', {
        default: 'text',
      })
      .option('--include-logs', 'Include captured logs in the output (for debugging)', {
        default: false,
      })
      .option('--cache [cache]', 'Cache results in server storage (requires server mode)', {
        default: true,
      });

    addCommonOptions(runCommand).action(async (options: AgentCLIArguments = {}) => {
      try {
        let input: string;

        // Check if input is provided via --input parameter
        if (options.input && (Array.isArray(options.input) ? options.input.length > 0 : true)) {
          input = Array.isArray(options.input) ? options.input.join(' ') : options.input;
        } else {
          // If no --input is provided, try to read from stdin (pipe)
          const stdinInput = await readFromStdin();

          if (!stdinInput) {
            console.error(
              'Error: No input provided. Use --input parameter or pipe content to stdin',
            );
            process.exit(1);
          }

          input = stdinInput;
        }

        // Only force quiet mode if debug mode is not enabled
        const quietMode = options.debug ? false : true;

        const { appConfig, isDebug, agentConstructor, agentName } = await this.processCommonOptions(
          {
            ...options,
            quiet: quietMode,
          },
        );

        // Check if we should use server mode with caching
        const useCache = options.cache !== false;

        if (useCache) {
          // Process the query using server mode (with storage)
          await processServerRun({
            appConfig,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
            isDebug,
            agentConstructor,
            agentName,
          });
        } else {
          // Process the query in silent mode (original behavior)
          await processSilentRun({
            appConfig,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
            agentConstructor,
            agentName,
          });
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
  }

  /**
   * Process common command options and prepare configuration
   * Handles option parsing, config loading, and merging for reuse across commands
   */
  async processCommonOptions(options: AgentCLIArguments): Promise<{
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
