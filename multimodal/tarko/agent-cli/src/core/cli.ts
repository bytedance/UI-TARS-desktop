/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import { AgentAppConfig, AgentCLIArguments, AgentConstructor } from '@tarko/agent-server-interface';
import { addCommonOptions, resolveAgent } from './options';
import { buildConfigPaths } from '../config/paths';
import { readFromStdin } from './stdin';
import { logger, printWelcomeLogo } from '../utils';
import { ConfigBuilder, loadAgentConfig } from '../config';
import { CLICommand, CLIInstance, TarkoAgentCLIOptions, WebUIOptions } from '../types';
import { AgentServerExtraOptions } from '@tarko/agent-server';
import { WorkspaceCommand } from './commands';
import * as fs from 'fs';

const DEFAULT_OPTIONS = {
  version: '1.0.0',
  buildTime: __BUILD_TIME__,
  gitHash: __GIT_HASH__,
};

/**
 * Agent CLI
 * Provides common functionality for building agent CLIs
 */
export class TarkoAgentCLI {
  protected cliOptions: TarkoAgentCLIOptions;

  /**
   * Create a new Tarko Agent CLI instance
   * @param options CLI initialization options
   */
  constructor(options: TarkoAgentCLIOptions) {
    this.cliOptions = {
      ...DEFAULT_OPTIONS,
      ...(options || {}),
    };
  }

  /**
   * Bootstrap Agent CLI
   */
  bootstrap(): void {
    const binName = this.cliOptions.binName ?? 'Tarko';

    const cli = cac(binName);
    cli.version(this.cliOptions.version);

    // Show logo on help command
    cli.help(() => {
      this.printLogo();
    });

    // Register all commands using template method pattern
    this.initializeCommands(cli);

    cli.parse();
  }

  /**
   * Template method for command registration
   * This method controls the overall command registration flow and should not be overridden
   * Subclasses should implement the hook methods instead
   */
  private initializeCommands(cli: CLIInstance): void {
    // Register core commands first
    this.registerCoreCommands(cli);

    // Hook for subclasses to extend CLI with additional commands and customizations
    this.extendCli(cli);
  }

  /**
   * Register core CLI commands
   * This method registers the basic commands that all agent CLIs should have
   */
  protected registerCoreCommands(cli: CLIInstance): void {
    this.registerServeCommand(cli);
    this.registerStartCommand(cli);
    this.registerRequestCommand(cli);
    this.registerRunCommand(cli);
  }

  /**
   * Hook method for subclasses to extend the CLI
   * Subclasses should override this method to add their specific commands and customizations
   *
   * @param cli The CAC CLI instance
   */
  protected extendCli(cli: CLIInstance): void {
    // No-op in base class - subclasses can override to extend CLI
  }

  /**
   * Register the 'serve' command
   */
  protected registerServeCommand(cli: CLIInstance): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    // Apply common options first
    let configuredCommand = addCommonOptions(serveCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);

    configuredCommand.action(async (options: AgentCLIArguments = {}) => {
      this.printLogo();

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);

        const extraOptions = this.getServerExtraOptions();
        await this.startHeadlessServer({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          extraOptions,
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
  protected registerStartCommand(cli: CLIInstance): void {
    const startCommand = cli.command('[start]', 'Run Agent in interactive UI');

    // Apply common options first
    let configuredCommand = addCommonOptions(startCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);

    configuredCommand.action(async (_, options: AgentCLIArguments = {}) => {
      this.printLogo();

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);

        const extraOptions = this.getServerExtraOptions();
        await this.startInteractiveWebUI({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          staticPath: this.getStaticPath(),
          extraOptions,
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
  protected registerRequestCommand(cli: CLIInstance): void {
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
          const { processRequestCommand } = await import('./commands/request');
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
  protected registerRunCommand(cli: CLIInstance): void {
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

    // Apply common options first
    let configuredCommand = addCommonOptions(runCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);

    configuredCommand.action(async (options: AgentCLIArguments = {}) => {
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
        const agentServerExtraOptions = this.getServerExtraOptions();

        if (useCache) {
          const { processServerRun } = await import('./commands/run');
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
          const { processSilentRun } = await import('./commands/run');
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
   * Hook method for configuring agent-specific CLI options
   * This method is called for commands that run agents (serve, start, run)
   * Subclasses can override this to add their specific CLI options
   *
   * @param command The command to configure
   * @returns The configured command with agent-specific options
   */
  protected configureAgentCommand(command: CLICommand): CLICommand {
    // Base implementation does nothing - subclasses should override to add custom options
    return command;
  }

  /**
   * Get static path for web UI - can be overridden by subclasses
   */
  protected getStaticPath(): string | undefined {
    return undefined;
  }

  /**
   * Get server extra options - can be overridden by subclasses
   */
  protected getServerExtraOptions(): AgentServerExtraOptions {
    return {
      version: this.cliOptions.version,
      buildTime: this.cliOptions.buildTime,
      gitHash: this.cliOptions.gitHash,
    };
  }

  /**
   * Print welcome logo - can be overridden by subclasses
   */
  protected printLogo(): void {
    printWelcomeLogo(
      this.cliOptions.binName || 'Agent CLI',
      this.cliOptions.version,
      'A atomic CLI for execute effective Agents',
    );
  }

  /**
   * Start headless server - can be overridden by subclasses
   */
  protected async startHeadlessServer(options: {
    appConfig: AgentAppConfig;
    isDebug?: boolean;
    agentConstructor: AgentConstructor;
    agentName: string;
    extraOptions?: AgentServerExtraOptions;
  }): Promise<void> {
    const { startHeadlessServer } = await import('./commands/serve');
    await startHeadlessServer(options);
  }

  /**
   * Start interactive web UI - can be overridden by subclasses
   */
  protected async startInteractiveWebUI(options: WebUIOptions): Promise<void> {
    const { startInteractiveWebUI } = await import('./commands/start');
    await startInteractiveWebUI(options);
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
    const configPaths = this.buildConfigPaths(options, isDebug);

    // Load user config from file
    const userConfig = await loadAgentConfig(configPaths, isDebug);

    // Build complete application configuration
    const appConfig = ConfigBuilder.buildAppConfig(options, userConfig);

    // Set logger level if specified
    if (appConfig.logLevel) {
      logger.setLevel(appConfig.logLevel);
    }

    // Resolve agent constructor
    const { agentConstructor, agentName } = await resolveAgent(
      options.agent,
      this.cliOptions.defaultAgent,
    );

    logger.debug(`Using agent: ${agentName}`);
    logger.debug('Application configuration built from CLI and config files');

    return { appConfig, isDebug, agentConstructor, agentName };
  }

  /**
   * Build configuration paths - can be overridden by subclasses
   */
  protected buildConfigPaths(options: AgentCLIArguments, isDebug: boolean): string[] {
    return buildConfigPaths({
      cliConfigPaths: options.config,
      remoteConfig: this.cliOptions.remoteConfig,
      isDebug,
    });
  }
}
