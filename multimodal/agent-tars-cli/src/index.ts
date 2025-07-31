/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import {
  TarkoAgentCLI,
  TarkoAgentCLIOptions,
  type AgentServerExtraOptions,
  type WebUIOptions,
} from '@tarko/agent-cli';
import type { AgentTARSCLIArguments } from './types';
import { CAC, Command } from 'cac';
import { WorkspaceCommand } from './commands/workspace';
import { AgioProvider } from './agio/AgioProvider';
import { buildConfigPaths } from '@tarko/agent-cli';
import { printWelcomeLogo } from '@tarko/agent-cli';

/**
 * Agent TARS CLI - Extends the base CLI with TARS-specific functionality
 */
export class AgentTARSCLI extends TarkoAgentCLI {
  /**
   * Create a new Agent TARS CLI instance
   * @param options CLI initialization options
   */
  constructor(options: TarkoAgentCLIOptions) {
    super(options);
  }

  /**

   * Hook method to extend the CLI with TARS-specific functionality
   * This method is automatically called by the base class during command initialization
   */

  protected extendCli(cli: CAC): void {
    this.registerWorkspaceCommand(cli);
  }

  /**
   * Hook method to configure common options for all commands
   * Adds Agent TARS specific options
   */
  protected configureCommonOptions(command: Command): Command {
    return (
      command
        // Browser configuration
        .option('--browser <browser>', 'browser config')
        .option('--browser.control [mode]', 'Browser control mode (dom, visual-grounding, hybrid)')
        .option('--browser.headless', 'Run browser in headless mode')
        .option('--browser.cdpEndpoint <endpoint>', 'CDP endpoint URL')
        .option(
          '--browser-control [mode]',
          'Browser control mode (deprecated, use --browser.control)',
        )
        .option(
          '--browser-cdp-endpoint <endpoint>',
          'CDP endpoint URL (deprecated, use --browser.cdpEndpoint)',
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

        // AGIO configuration
        .option('--agio <agio>', 'AGIO config')
        .option('--agio.provider [url]', 'AGIO provider URL for monitoring')

        // MCP configuration
        .option('--mcpImpl [impl]', 'MCP implementation (stdio, in-memory)', { default: 'stdio' })

        // Experimental features
        .option('--experimental <experimental>', 'Experimental features')
        .option('--experimental.dumpMessageHistory', 'Dump message history to JSON file')
    );
  }

  /**
   * Get static path for Agent TARS Web UI
   */
  protected getStaticPath(): string | undefined {
    const staticPath = path.resolve(__dirname, '../static');
    return fs.existsSync(staticPath) ? staticPath : undefined;
  }

  /**
   * Get server extra options with AGIO provider
   */
  protected getServerExtraOptions(): AgentServerExtraOptions {
    return {
      ...super.getServerExtraOptions(),
      agioProvider: AgioProvider,
    };
  }

  /**
   * Print Agent TARS welcome logo
   */
  protected printLogo(): void {
    printWelcomeLogo(
      'Agent TARS',
      this.cliOptions.version,
      'An open-source Multimodal AI Agent - https://agent-tars.com',
    );
  }

  /**
   * Build configuration paths with Agent TARS global workspace support
   */
  protected buildConfigPaths(options: AgentTARSCLIArguments, isDebug: boolean): string[] {
    const workspaceCommand = new WorkspaceCommand();
    let workspacePath: string | undefined;

    // Check if global workspace should be used
    try {
      if (
        (async () => {
          const enabled = await workspaceCommand.isGlobalWorkspaceEnabled();
          const created = await workspaceCommand.isGlobalWorkspaceCreated();
          return enabled && created;
        })()
      ) {
        workspacePath = workspaceCommand.getGlobalWorkspacePath();
      }
    } catch (error) {
      if (isDebug) {
        console.warn('Failed to check global workspace:', error);
      }
    }

    return buildConfigPaths({
      cliConfigPaths: options.config,
      remoteConfig: this.cliOptions.remoteConfig,
      workspacePath,
      isDebug,
    });
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
}

// Export types for external use
export * from './types';
export { WorkspaceCommand } from './commands/workspace';
