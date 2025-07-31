/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac, { CAC, Command } from 'cac';
import { AgentAppConfig, AgentCLIArguments, AgentConstructor } from '@tarko/agent-server-interface';
import { addCommonOptions, defaultAgentResolver } from './options';
import { buildConfigPaths } from '../config/paths';
import { readFromStdin } from './stdin';
import { logger, printWelcomeLogo } from '../utils';
import { ConfigBuilder, loadAgentConfig } from '../config';
import {
  AgentBootstrapCLIOptions,
  CustomCommand,
  CLIExtensionOptions,
  WebUIOptions,
  OptionsConfigurator,
} from '../types';
import { AgentServerExtraOptions } from '@tarko/agent-server';

/**
 * Agent CLI
 * Provides common functionality for building agent CLIs
 */
export class TarkoAgentCLI {
  protected bootstrapOptions: AgentBootstrapCLIOptions = {
    version: '1.0.0',
    buildTime: __BUILD_TIME__,
    gitHash: __GIT_HASH__,
  };

  protected extensionOptions: CLIExtensionOptions = {};

  /**
   * Bootstrap Agent CLI
   */
  bootstrap(options: AgentBootstrapCLIOptions, extensionOptions: CLIExtensionOptions = {}): void {
    this.bootstrapOptions = options;
    this.extensionOptions = extensionOptions;
    const binName = options.binName ?? 'Tarko';

    const cli = cac(binName);
    cli.version(options.version);

    // Show logo on help command
    cli.help(() => {
      this.printLogo();
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

    this.configureServeCommand(serveCommand).action(async (options: AgentCLIArguments = {}) => {
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
  protected registerStartCommand(cli: CAC): void {
    const startCommand = cli.command('[start]', 'Run Agent in interactive UI');

    this.configureStartCommand(startCommand).action(async (_, options: AgentCLIArguments = {}) => {
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

    this.configureRunCommand(runCommand).action(async (options: AgentCLIArguments = {}) => {
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
   * Configure serve command options - can be overridden by subclasses
   */
  protected configureServeCommand(command: Command): Command {
    const configurator = this.getServeOptionsConfigurator();
    return addCommonOptions(command, configurator);
  }

  /**
   * Configure start command options - can be overridden by subclasses
   */
  protected configureStartCommand(command: Command): Command {
    const configurator = this.getStartOptionsConfigurator();
    return addCommonOptions(command, configurator);
  }

  /**
   * Configure run command options - can be overridden by subclasses
   */
  protected configureRunCommand(command: Command): Command {
    const configurator = this.getRunOptionsConfigurator();
    return addCommonOptions(command, configurator);
  }

  /**
   * Get serve command options configurator
   */
  protected getServeOptionsConfigurator(): OptionsConfigurator | undefined {
    const common = this.extensionOptions.commonOptionsConfigurator;
    const serve = this.extensionOptions.serveOptionsConfigurator;

    if (!common && !serve) return undefined;

    return (command) => {
      if (common) command = common(command);
      if (serve) command = serve(command);
      return command;
    };
  }

  /**
   * Get start command options configurator
   */
  protected getStartOptionsConfigurator(): OptionsConfigurator | undefined {
    const common = this.extensionOptions.commonOptionsConfigurator;
    const start = this.extensionOptions.startOptionsConfigurator;

    if (!common && !start) return undefined;

    return (command) => {
      if (common) command = common(command);
      if (start) command = start(command);
      return command;
    };
  }

  /**
   * Get run command options configurator
   */
  protected getRunOptionsConfigurator(): OptionsConfigurator | undefined {
    const common = this.extensionOptions.commonOptionsConfigurator;
    const run = this.extensionOptions.runOptionsConfigurator;

    if (!common && !run) return undefined;

    return (command) => {
      if (common) command = common(command);
      if (run) command = run(command);
      return command;
    };
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
      version: this.bootstrapOptions.version,
      buildTime: this.bootstrapOptions.buildTime,
      gitHash: this.bootstrapOptions.gitHash,
    };
  }

  /**
   * Print welcome logo - can be overridden by subclasses
   */
  protected printLogo(): void {
    printWelcomeLogo(
      this.bootstrapOptions.binName || 'Agent CLI',
      this.bootstrapOptions.version!,
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
    const resolver = this.bootstrapOptions.agentResolver || defaultAgentResolver;
    const { agentConstructor, agentName } = await resolver(options.agent || 'tarko');

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
      remoteConfig: this.bootstrapOptions.remoteConfig,
      isDebug,
    });
  }
}
