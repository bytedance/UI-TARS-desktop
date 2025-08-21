/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import path from 'path';
import {
  AgentCLIArguments,
  AgentServerVersionInfo,
  TARKO_CONSTANTS,
  LogLevel,
} from '@tarko/interface';
import { addCommonOptions, resolveAgentFromCLIArgument } from './options';
import { buildConfigPaths } from '../config/paths';
import { readFromStdin } from './stdin';
import { deepMerge, logger, printWelcomeLogo, resolveWorkspacePath } from '../utils';
import {
  buildAppConfig,
  CLIOptionsEnhancer,
  loadAgentConfig,
  loadEnvironmentVars,
} from '../config';
import { GlobalWorkspaceCommand } from './commands';
import { CLICommand, CLIInstance, AgentCLIInitOptions, AgentServerInitOptions } from '../types';

const DEFAULT_OPTIONS: Partial<AgentCLIInitOptions> = {
  versionInfo: {
    version: '1.0.0',
    buildTime: __BUILD_TIME__,
    gitHash: __GIT_HASH__,
  },
};

/**
 * Tarko Agent CLI
 */
export class AgentCLI {
  protected options: AgentCLIInitOptions;

  /**
   * Create a new Tarko Agent CLI instance
   *
   * @param options CLI initialization options
   */
  constructor(options: AgentCLIInitOptions) {
    const mergedOptions = deepMerge(DEFAULT_OPTIONS, options ?? {}) as AgentCLIInitOptions;
    this.options = mergedOptions;
  }

  /**
   * Get version info
   */
  getVersionInfo(): AgentServerVersionInfo {
    return this.options.versionInfo!;
  }

  /**
   * Bootstrap Agent CLI
   */
  bootstrap(): void {
    const binName = this.options.binName ?? 'Tarko';
    const cli = cac(binName);
    cli.version(this.getVersionInfo().version);
    cli.help(() => {
      this.printLogo();
    });
    this.initializeCommands(cli);
    cli.parse();
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
   * Hook method for configuring high-level-agent-specific CLI options
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
   * Hook method for creating CLI options enhancer
   * Subclasses can override this to provide their own option processing logic
   *
   * @returns CLI options enhancer function or undefined
   */
  protected configureCLIOptionsEnhancer(): CLIOptionsEnhancer | undefined {
    return undefined;
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
  private registerCoreCommands(cli: CLIInstance): void {
    this.registerServeCommand(cli);
    this.registerRunCommand(cli);
    this.registerRequestCommand(cli);
    this.registerWorkspaceCommand(cli);
  }

  /**
   * Print welcome logo - can be overridden by subclasses
   */
  protected printLogo(): void {
    printWelcomeLogo(
      this.options.binName || 'Tarko',
      this.getVersionInfo().version,
      'An atomic Agentic CLI for executing effective Agents',
    );
  }

  /**
   * Register the 'serve' command
   */
  private registerServeCommand(cli: CLIInstance): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent Server.');

    // Apply common options first
    let configuredCommand = addCommonOptions(serveCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);

    configuredCommand.action(async (cliArguments: AgentCLIArguments = {}) => {
      this.printLogo();

      try {
        const { agentServerInitOptions, isDebug } = await this.processCLIArguments(cliArguments);
        const { startHeadlessServer } = await import('./commands/serve');
        await startHeadlessServer({
          agentServerInitOptions,
          isDebug,
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Register the 'run' command (default command)
   */
  private registerRunCommand(cli: CLIInstance): void {
    const runCommand = cli.command('[run] [agent]', 'Run Agent in interactive UI or headless mode');

    runCommand
      .option('--headless', 'Run in headless mode and output results to stdout')
      .option('--input [...query]', 'Input query to process (for headless mode)')
      .option(
        '--format [format]',
        'Output format: "json" or "text" (default: "text") (for headless mode)',
        {
          default: 'text',
        },
      )
      .option(
        '--include-logs',
        'Include captured logs in the output (for debugging) (for headless mode)',
        {
          default: false,
        },
      )
      .option(
        '--use-cache [useCache]',
        'Use cache for headless mode execution (for headless mode)',
        {
          default: true,
        },
      );

    // Apply common options first
    let configuredCommand = addCommonOptions(runCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);
    configuredCommand.action(async (...args: any[]) => {
      // Handle dynamic arguments due to optional positional parameters [run] [agent]
      // CAC passes arguments in this pattern:
      // - tarko --agent ./        -> args = [undefined, undefined, cliArguments]
      // - tarko run              -> args = ['run', undefined, cliArguments]
      // - tarko run ./           -> args = ['run', './', cliArguments]
      // - tarko ./               -> args = [undefined, './', cliArguments]

      // The last argument is always the parsed CLI options object
      const cliArguments: AgentCLIArguments = args[args.length - 1] || {};

      // The second-to-last argument is the agent parameter
      const agent = args[args.length - 2];

      // If agent is provided as positional argument, use it
      if (agent && typeof agent === 'string') {
        // Warn if both positional agent and --agent flag are provided
        if (cliArguments.agent && cliArguments.agent !== agent) {
          console.warn(
            `Warning: Both positional agent '${agent}' and --agent flag '${cliArguments.agent}' provided. Using positional agent '${agent}'.`,
          );
        }
        cliArguments.agent = agent;
      }

      if (cliArguments.headless) {
        // Headless mode - same as old 'run' command
        await this.runHeadlessMode(cliArguments);
      } else {
        // Interactive UI mode - same as old 'start' command
        await this.runInteractiveMode(cliArguments);
      }
    });
  }

  /**
   * Register the 'request' command
   */
  private registerRequestCommand(cli: CLIInstance): void {
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
   * Handle headless mode execution
   */
  private async runHeadlessMode(cliArguments: AgentCLIArguments): Promise<void> {
    try {
      let input: string;

      if (
        cliArguments.input &&
        (Array.isArray(cliArguments.input) ? cliArguments.input.length > 0 : true)
      ) {
        input = Array.isArray(cliArguments.input)
          ? cliArguments.input.join(' ')
          : cliArguments.input;
      } else {
        const stdinInput = await readFromStdin();

        if (!stdinInput) {
          console.error('Error: No input provided. Use --input parameter or pipe content to stdin');
          process.exit(1);
        }

        input = stdinInput;
      }

      const quietMode = cliArguments.debug ? false : true;

      const { agentServerInitOptions, isDebug } = await this.processCLIArguments({
        ...cliArguments,
        quiet: quietMode,
      });

      const useCache = cliArguments.useCache !== false;

      if (useCache) {
        const { processServerRun } = await import('./commands/run');
        await processServerRun({
          agentServerInitOptions,
          input,
          format: cliArguments.format as 'json' | 'text',
          includeLogs: cliArguments.includeLogs || !!cliArguments.debug,
          isDebug,
        });
      } else {
        const { processSilentRun } = await import('./commands/run');
        await processSilentRun({
          agentServerInitOptions,
          input,
          format: cliArguments.format as 'json' | 'text',
          includeLogs: cliArguments.includeLogs || !!cliArguments.debug,
        });
      }
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  /**
   * Handle interactive mode execution
   */
  private async runInteractiveMode(cliArguments: AgentCLIArguments): Promise<void> {
    this.printLogo();
    try {
      const { agentServerInitOptions, isDebug } = await this.processCLIArguments(cliArguments);
      const { startInteractiveWebUI } = await import('./commands/start');
      await startInteractiveWebUI({
        agentServerInitOptions,
        isDebug,
        open: cliArguments.open,
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }

  /**
   * Process common command options and prepare configuration
   * This method is now private and handles all common CLI argument processing
   */
  private async processCLIArguments(cliArguments: AgentCLIArguments): Promise<{
    agentServerInitOptions: AgentServerInitOptions;
    isDebug: boolean;
  }> {
    const isDebug = !!cliArguments.debug;

    // Set logger level early based on CLI arguments
    if (cliArguments.quiet) {
      logger.setLevel(LogLevel.SILENT);
    } else if (isDebug) {
      logger.setLevel(LogLevel.DEBUG);
    }

    const workspace = resolveWorkspacePath(process.cwd(), cliArguments.workspace);

    // Init Environment Variables from .env files
    loadEnvironmentVars(workspace, isDebug);

    const globalWorkspaceCommand = new GlobalWorkspaceCommand(
      this.options.directories?.globalWorkspaceDir,
    );
    const globalWorkspaceEnabled = await globalWorkspaceCommand.isGlobalWorkspaceEnabled();

    // Build config paths with proper priority order
    const configPaths = buildConfigPaths({
      cliConfigPaths: cliArguments.config,
      remoteConfig: this.options.remoteConfig,
      workspace,
      globalWorkspaceEnabled,
      globalWorkspaceDir:
        this.options.directories?.globalWorkspaceDir || TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR,
      isDebug,
    });

    const userConfig = await loadAgentConfig(configPaths, isDebug);

    // Get CLI options enhancer from subclass
    const cliOptionsEnhancer = this.configureCLIOptionsEnhancer();

    const appConfig = buildAppConfig(
      cliArguments,
      userConfig,
      this.options.appConfig,
      cliOptionsEnhancer,
      workspace,
    );

    // Update logger level with final config if it differs from CLI arguments
    if (appConfig.logLevel && !cliArguments.quiet && !isDebug) {
      logger.setLevel(appConfig.logLevel);
    }

    // Map CLI options to `AgentImplementation` that can be consumed by
    // the AgentServer and hand them over to the Server for processing
    const agentImplementation = await resolveAgentFromCLIArgument(
      cliArguments.agent,
      appConfig.agent ?? this.options.appConfig?.agent,
    );

    logger.debug(`Using agent: ${agentImplementation.label ?? cliArguments.agent}`);

    // Set agent config.
    appConfig.agent = agentImplementation;
    // Set workspace config
    appConfig.workspace = workspace;

    return {
      agentServerInitOptions: {
        appConfig,
        versionInfo: this.options.versionInfo,
        directories: this.options.directories,
      },
      isDebug,
    };
  }

  private registerWorkspaceCommand(cli: CLIInstance): void {
    const workspaceCommand = cli.command('workspace', 'Manage agent workspace');

    workspaceCommand
      .option('--init', 'Initialize a new workspace')
      .option('--open', 'Open the workspace in VSCode')
      .option('--enable', 'Enable global workspace')
      .option('--disable', 'Disable global workspace')
      .option('--status', 'Show workspace status')
      .action(
        async (
          options: {
            init?: boolean;
            open?: boolean;
            enable?: boolean;
            disable?: boolean;
            status?: boolean;
          } = {},
        ) => {
          try {
            const workspaceCmd = new GlobalWorkspaceCommand(
              this.options.directories?.globalWorkspaceDir,
            );
            await workspaceCmd.execute(options);
          } catch (err) {
            console.error(
              'Workspace command failed:',
              err instanceof Error ? err.message : String(err),
            );
            process.exit(1);
          }
        },
      );
  }
}
