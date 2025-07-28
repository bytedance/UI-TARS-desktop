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
import { addCommonOptions, defaultAgentResolver } from './options';
import { startHeadlessServer } from './commands/serve';
import { startInteractiveWebUI } from './commands/start';
import { processRequestCommand } from './commands/request';
import { processSilentRun, processServerRun } from './commands/run';
import { buildConfigPaths } from '../config/paths';
import { readFromStdin } from './stdin';
import { logger, printWelcomeLogo } from '../utils';
import { ConfigBuilder, loadAgentConfig } from '../config';
import { BootstrapCLIOptions, CustomCommand } from '../types';
import { AgentServerExtraOptions } from '@multimodal/agent-server';

/**
 * Base Agent CLI framework
 * Provides common functionality for building agent CLIs
 */
export class BaseAgentCLI {
  protected bootstrapOptions: BootstrapCLIOptions = {
    version: '1.0.0',
    buildTime: Date.now(),
    gitHash: 'unknown',
  };

  /**
   * Bootstrap Agent CLI
   */
  bootstrap(options: BootstrapCLIOptions) {
    this.bootstrapOptions = options;

    const cli = cac(options.binName ?? 'agent');
    cli.version(options.version);

    // Show logo on help command
    cli.help(() => {
      printWelcomeLogo(
        options.binName || 'Agent CLI',
        options.version,
        'A flexible CLI framework for multimodal agents',
      );
    });

    // Register all commands
    this.registerCommands(cli);

    // Register custom commands if provided
    if (options.customCommands) {
      this.registerCustomCommands(cli, options.customCommands);
    }

    cli.parse();
  }

  /**
   * Register core CLI commands
   */
  protected registerCommands(cli: CAC): void {
    this.registerServeCommand(cli);
    this.registerStartCommand(cli);
    this.registerRequestCommand(cli);
    this.registerRunCommand(cli);
  }

  /**
   * Register custom commands
   */
  protected registerCustomCommands(cli: CAC, customCommands: CustomCommand[]): void {
    customCommands.forEach((command) => {
      const cmd = cli.command(command.name, command.description);

      if (command.optionsConfigurator) {
        command.optionsConfigurator(cmd);
      }

      cmd.action(async (options = {}) => {
        try {
          await command.handler.execute(options);
        } catch (err) {
          console.error(`Failed to execute ${command.name}:`, err);
          process.exit(1);
        }
      });
    });
  }

  /**
   * Register the 'serve' command
   */
  protected registerServeCommand(cli: CAC): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    addCommonOptions(serveCommand).action(async (options: AgentCLIArguments = {}) => {
      printWelcomeLogo(
        this.bootstrapOptions.binName || 'Agent CLI',
        this.bootstrapOptions.version!,
      );

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);
        await startHeadlessServer({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          extraOptions: {
            version: this.bootstrapOptions.version,
            buildTime: this.bootstrapOptions.buildTime,
            gitHash: this.bootstrapOptions.gitHash,
          },
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Register the start command
   */
  protected registerStartCommand(cli: CAC): void {
    const startCommand = cli.command('[start]', 'Run Agent in interactive UI');

    addCommonOptions(startCommand).action(async (_, options: AgentCLIArguments = {}) => {
      printWelcomeLogo(
        this.bootstrapOptions.binName || 'Agent CLI',
        this.bootstrapOptions.version!,
      );

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);

        await startInteractiveWebUI({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          extraOptions: {
            version: this.bootstrapOptions.version,
            buildTime: this.bootstrapOptions.buildTime,
            gitHash: this.bootstrapOptions.gitHash,
          },
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Register the 'request' command
   */
  protected registerRequestCommand(cli: CAC): void {
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
   * Register the 'run' command
   */
  protected registerRunCommand(cli: CAC): void {
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

        if (options.input && (Array.isArray(options.input) ? options.input.length > 0 : true)) {
          input = Array.isArray(options.input) ? options.input.join(' ') : options.input;
        } else {
          const stdinInput = await readFromStdin();

          if (!stdinInput) {
            console.error(
              'Error: No input provided. Use --input parameter or pipe content to stdin',
            );
            process.exit(1);
          }

          input = stdinInput;
        }

        const quietMode = options.debug ? false : true;

        const { appConfig, isDebug, agentConstructor, agentName } = await this.processCommonOptions(
          {
            ...options,
            quiet: quietMode,
          },
        );

        const useCache = options.cache !== false;
        const agentServerExtraOptions: AgentServerExtraOptions = {
          version: this.bootstrapOptions.version,
          buildTime: this.bootstrapOptions.buildTime,
          gitHash: this.bootstrapOptions.gitHash,
        };
        if (useCache) {
          await processServerRun({
            appConfig,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
            isDebug,
            agentConstructor,
            agentName,
            agentServerExtraOptions,
          });
        } else {
          await processSilentRun({
            appConfig,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
            agentConstructor,
            agentName,
            agentServerExtraOptions,
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
   */
  protected async processCommonOptions(options: AgentCLIArguments): Promise<{
    appConfig: AgentAppConfig;
    isDebug: boolean;
    agentConstructor: AgentConstructor;
    agentName: string;
  }> {
    const isDebug = !!options.debug;

    // Build configuration paths
    const configPaths = buildConfigPaths({
      cliConfigPaths: options.config,
      remoteConfig: this.bootstrapOptions.remoteConfig,
      isDebug,
    });

    // Load user config from file
    const userConfig = await loadAgentConfig(configPaths, isDebug);

    // Build complete application configuration
    const appConfig = ConfigBuilder.buildAppConfig(options, userConfig);

    // Set logger level if specified
    if (appConfig.logLevel) {
      logger.setLevel(appConfig.logLevel);
    }

    // Resolve agent constructor
    const resolver = this.bootstrapOptions.agentResolver || defaultAgentResolver;
    const { agentConstructor, agentName } = await resolver(options.agent || 'default');

    logger.debug(`Using agent: ${agentName}`);
    logger.debug('Application configuration built from CLI and config files');

    return { appConfig, isDebug, agentConstructor, agentName };
  }
}
