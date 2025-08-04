/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import cac from 'cac';
import {
  AgentCLIArguments,
  AgentServerVersionInfo,
  TARKO_CONSTANTS,
} from '@tarko/agent-server-interface';
import { addCommonOptions, resolveAgentFromCLIArgument } from './options';
import { buildConfigPaths } from '../config/paths';
import { readFromStdin } from './stdin';
import { logger, printWelcomeLogo } from '../utils';
import { buildAppConfig, CLIOptionsEnhancer, loadAgentConfig } from '../config';
import { WorkspaceCommand } from './commands';
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
    this.options = {
      ...DEFAULT_OPTIONS,
      ...(options || {}),
    };
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
    this.registerStartCommand(cli);
    this.registerRequestCommand(cli);
    this.registerRunCommand(cli);
    this.registerWorkspaceCommand(cli);
  }

  /**
   * Get static path for web UI - can be overridden by subclasses
   */
  protected getStaticPath(): string | undefined {
    return undefined;
  }

  /**
   * Print welcome logo - can be overridden by subclasses
   */
  protected printLogo(): void {
    printWelcomeLogo(
      this.options.binName || 'Tarko',
      this.getVersionInfo().version,
      'A atomic Agentic CLI for execute effective Agents',
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
   * Register the 'start' command
   */
  private registerStartCommand(cli: CLIInstance): void {
    const startCommand = cli.command('[start]', 'Run Agent in interactive UI');

    // Apply common options first
    let configuredCommand = addCommonOptions(startCommand);

    // Apply agent-specific configurations for commands that run agents
    configuredCommand = this.configureAgentCommand(configuredCommand);
    configuredCommand.action(async (_, cliArguments: AgentCLIArguments = {}) => {
      this.printLogo();
      try {
        const { agentServerInitOptions, isDebug } = await this.processCLIArguments(cliArguments);
        const { startInteractiveWebUI } = await import('./commands/start');
        await startInteractiveWebUI({
          agentServerInitOptions,
          isDebug,
          staticPath: this.getStaticPath(),
          open: cliArguments.open,
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
   * Register the 'run' command
   */
  private registerRunCommand(cli: CLIInstance): void {
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

        const { agentServerInitOptions, isDebug } = await this.processCLIArguments({
          ...options,
          quiet: quietMode,
        });

        const useCache = options.cache !== false;

        if (useCache) {
          const { processServerRun } = await import('./commands/run');
          await processServerRun({
            agentServerInitOptions,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
            isDebug,
          });
        } else {
          const { processSilentRun } = await import('./commands/run');
          await processSilentRun({
            agentServerInitOptions,
            input,
            format: options.format as 'json' | 'text',
            includeLogs: options.includeLogs || !!options.debug,
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
   * This method is now private and handles all common CLI argument processing
   */
  private async processCLIArguments(cliArguments: AgentCLIArguments): Promise<{
    agentServerInitOptions: AgentServerInitOptions;
    isDebug: boolean;
  }> {
    const isDebug = !!cliArguments.debug;
    // FIXME: using cwd passed from options
    const workspacePath = cliArguments.workspace ?? process.cwd();
    const workspaceCommand = new WorkspaceCommand(this.options.directories?.globalWorkspaceDir);
    const globalWorkspaceEnabled = await workspaceCommand.isGlobalWorkspaceEnabled();

    // Build config paths with proper priority order
    const configPaths = buildConfigPaths({
      cliConfigPaths: cliArguments.config,
      remoteConfig: this.options.remoteConfig,
      workspacePath,
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
    );

    if (appConfig.logLevel) {
      logger.setLevel(appConfig.logLevel);
    }

    // Map CLI options to `AgentImplementation` that can be consumed by
    // the AgentServer and hand them over to the Server for processing
    const agentImplementation = await resolveAgentFromCLIArgument(
      cliArguments.agent,
      this.options.appConfig?.agent,
    );

    logger.debug(`Using agent: ${agentImplementation.label ?? cliArguments.agent}`);

    // Set agent config.
    appConfig.agent = agentImplementation;

    return {
      agentServerInitOptions: {
        appConfig,
        versionInfo: this.options.versionInfo,
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
            const workspaceCmd = new WorkspaceCommand(this.options.directories?.globalWorkspaceDir);
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
