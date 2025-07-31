/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import {
  BaseAgentCLI,
  processServerRun,
  addCommonOptions,
  printWelcomeLogo,
} from '@multimodal/agent-cli';
import type { AgentServerExtraOptions } from '@multimodal/agent-cli';
import { AgentTARSCLIArguments } from '@agent-tars/interface';
import { CAC, Command } from 'cac';
import { WorkspaceCommand } from './commands/workspace';
import { AgioProvider } from './agio/AgioProvider';

/**
 * Agent TARS CLI - Extends the base CLI with TARS-specific functionality
 */
export class AgentTARSCLI extends BaseAgentCLI {
  /**
   * Register all CLI commands including TARS-specific ones
   */
  protected registerCommands(cli: CAC): void {
    // Register base commands first
    super.registerCommands(cli);

    // Register TARS-specific commands
    this.registerWorkspaceCommand(cli);
  }

  /**
   * Add TARS-specific options to commands
   */
  protected addCommonOptions(command: Command): Command {
    const baseCommand = addCommonOptions(command);

    return (
      baseCommand
        // Browser configuration
        .option('--browser <browser>', 'browser config')
        .option('--browser.control [mode]', 'Browser control mode (dom, visual-grounding, hybrid)')
        .option('--browser.headless', 'Run browser in headless mode')
        .option('--browser.cdpEndpoint <endpoint>', 'CDP endpoint URL')
        .option(
          '--browser-control [mode]',
          'Browser control mode (deprecated, use --browser.control)',
        )

        // Planner configuration
        .option('--planner <planner>', 'Planner config')
        .option('--planner.enable', 'Enable planning functionality')
        .option('--planner.maxSteps [steps]', 'Maximum plan steps', { default: 3 })

        // Search configuration
        .option('--search <search>', 'Search config')
        .option(
          '--search.provider [provider]',
          'Search provider (browser_search, tavily, bing_search)',
        )
        .option('--search.count [count]', 'Search result count', { default: 10 })
        .option('--search.apiKey [apiKey]', 'Search API key')

        // MCP configuration
        .option('--mcpImpl [impl]', 'MCP implementation (stdio, in-memory)', { default: 'stdio' })

        // Experimental features
        .option('--experimental <experimental>', 'Experimental features')
        .option('--experimental.dumpMessageHistory', 'Dump message history to JSON file')
    );
  }

  /**
   * Register workspace management command
   */
  protected registerWorkspaceCommand(cli: CAC): void {
    const workspaceCommand = new WorkspaceCommand();

    cli
      .command('workspace', 'Manage Agent TARS global workspace')
      .option('--init', 'Initialize a new workspace')
      .option('--open', 'Open workspace in VSCode')
      .option('--enable', 'Enable global workspace')
      .option('--disable', 'Disable global workspace')
      .option('--status', 'Show current workspace status')
      .action(async (options = {}) => {
        await workspaceCommand.execute(options);
      });
  }

  /**
   * Override start command to include static path
   */
  protected registerStartCommand(cli: CAC): void {
    const startCommand = cli.command('[start]', 'Run Agent TARS in interactive UI');

    this.addCommonOptions(startCommand).action(async (_, options: AgentTARSCLIArguments = {}) => {
      this.printWelcomeLogo();

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);

        // Set static path for Agent TARS Web UI
        const staticPath = path.resolve(__dirname, '../static');

        const { startInteractiveWebUI } = await import('@multimodal/agent-cli');

        await startInteractiveWebUI({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          staticPath: fs.existsSync(staticPath) ? staticPath : undefined,
          extraOptions: {
            version: this.bootstrapOptions.version,
            buildTime: this.bootstrapOptions.buildTime,
            gitHash: this.bootstrapOptions.gitHash,
            agioProvider: AgioProvider,
          },
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Override serve command to include AGIO provider
   */
  protected registerServeCommand(cli: CAC): void {
    const serveCommand = cli.command('serve', 'Launch a headless Agent TARS Server.');

    this.addCommonOptions(serveCommand).action(async (options: AgentTARSCLIArguments = {}) => {
      this.printWelcomeLogo();

      try {
        const { appConfig, isDebug, agentConstructor, agentName } =
          await this.processCommonOptions(options);

        const { startHeadlessServer } = await import('@multimodal/agent-cli');

        await startHeadlessServer({
          appConfig,
          isDebug,
          agentConstructor,
          agentName,
          extraOptions: {
            version: this.bootstrapOptions.version,
            buildTime: this.bootstrapOptions.buildTime,
            gitHash: this.bootstrapOptions.gitHash,
            // @ts-expect-error
            agioProvider: AgioProvider,
          },
        });
      } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
      }
    });
  }

  /**
   * Override run command to include AGIO provider
   */
  protected registerRunCommand(cli: CAC): void {
    const runCommand = cli.command(
      'run',
      'Run Agent TARS in silent mode and output results to stdout',
    );

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

    this.addCommonOptions(runCommand).action(async (options: AgentTARSCLIArguments = {}) => {
      try {
        let input: string;

        if (options.input && (Array.isArray(options.input) ? options.input.length > 0 : true)) {
          input = Array.isArray(options.input) ? options.input.join(' ') : options.input;
        } else {
          const { readFromStdin } = await import('@multimodal/agent-cli');
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
          agioProvider: AgioProvider,
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
          const { processSilentRun } = await import('@multimodal/agent-cli');
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
   * Print Agent TARS welcome logo
   */
  private printWelcomeLogo(): void {
    printWelcomeLogo(
      'Agent TARS',
      this.bootstrapOptions.version!,
      'An open-source Multimodal AI Agent - https://agent-tars.com',
    );
  }
}
