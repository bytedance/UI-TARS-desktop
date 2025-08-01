/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  TarkoAgentCLI,
  TarkoAgentCLIOptions,
  printWelcomeLogo,
  CLICommand,
} from '@tarko/agent-cli';
import { AgentTARS } from '@agent-tars/core';

export type { AgentTARSCLIArguments } from '@agent-tars/interface';

const packageJson = require('../package.json');
const DEFAULT_OPTIONS: TarkoAgentCLIOptions = {
  version: packageJson.version,
  buildTime: __BUILD_TIME__,
  gitHash: __GIT_HASH__,
  binName: 'agent-tars',
  defaultAgent: {
    agentConstructor: AgentTARS,
    agentName: 'Agent TARS',
  },
};

/**
 * Agent TARS CLI - Extends the base CLI with TARS-specific functionality
 */
export class AgentTARSCLI extends TarkoAgentCLI {
  constructor(options: TarkoAgentCLIOptions) {
    super({
      ...DEFAULT_OPTIONS,
      ...(options || {}),
    });
  }

  /**
   * Configure CLI commands with Agent TARS specific options
   * This method is called for all agent commands (serve, start, run)
   * and adds TARS-specific CLI options like browser control, search, planner, etc.
   *
   * @param command The command to configure
   * @returns The configured command with TARS-specific options
   */
  protected configureAgentCommand(command: CLICommand): CLICommand {
    return (
      command
        // Browser configuration
        .option('--browser <browser>', 'browser config')
        .option('--browser.control [mode]', 'Browser control mode (hybrid, dom, visual-grounding)')
        .option(
          '--browser-control [mode]',
          'Browser control mode (deprecated, replaced by `--browser.control`)',
        )
        .option(
          '--browser.cdpEndpoint <endpoint>',
          'CDP endpoint to connect to, for example "http://127.0.0.1:9222/json/version',
        )
        // Planner configuration
        .option('--planner <planner>', 'Planner config')
        .option('--planner.enable', 'Enable planning functionality for complex tasks')

        // Search configuration
        .option('--search <search>', 'Search config')
        .option(
          '--search.provider [provider]',
          'Search provider (browser_search, tavily, bing_search)',
        )
        .option('--search.count [count]', 'Search result count', { default: 10 })
        .option('--search.apiKey [apiKey]', 'Search API key')
    );
  }

  /**
   * Print Agent TARS welcome logo with custom dual ASCII art
   */
  protected printLogo(): void {
    // ASCII art logo for AGENT
    const agentArt = [
      ' █████  ██████  ███████ ███    ██ ████████',
      '██   ██ ██      ██      ████   ██    ██   ',
      '███████ ██   ██ █████   ██ ██  ██    ██   ',
      '██   ██ ██   ██ ██      ██  ██ ██    ██   ',
      '██   ██ ███████ ███████ ██   ████    ██   ',
    ].join('\n');

    // ASCII art logo for TARS
    const tarsArt = [
      '████████  █████  ██████   ███████',
      '   ██    ██   ██ ██   ██  ██     ',
      '   ██    ███████ ██████   ███████',
      '   ██    ██   ██ ██   ██       ██',
      '   ██    ██   ██ ██   ██  ███████',
    ].join('\n');

    printWelcomeLogo(
      'Agent TARS',
      this.cliOptions.version,
      'An open-source Multimodal AI Agent',
      [agentArt, tarsArt],
      'https://agent-tars.com',
    );
  }
}
