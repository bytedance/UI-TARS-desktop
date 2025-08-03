/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  TarkoAgentCLI,
  TarkoAgentCLIOptions,
  printWelcomeLogo,
  CLICommand,
  ConfigBuilder,
} from '@tarko/agent-cli';
import { AgentTARS } from '@agent-tars/core';
import {
  AgentTARSCLIArguments,
  AgentTARSAppConfig,
  BrowserControlMode,
} from '@agent-tars/interface';

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
   */
  protected configureAgentCommand(command: CLICommand): CLICommand {
    return (
      command
        // Browser configuration
        .option('--browser <browser>', 'browser config')
        .option(
          '--browser-control [mode]',
          'Browser control mode (deprecated, replaced by `--browser.control`)',
        )
        .option(
          '--browser-cdp-endpoint <endpoint>',
          'CDP endpoint (deprecated, replaced by `--browser.cdpEndpoint`)',
        )
        .option('--browser.control [mode]', 'Browser control mode (hybrid, dom, visual-grounding)')
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
   * Build Agent TARS specific configuration with deprecated options handling
   */
  protected buildConfig(
    cliArguments: AgentTARSCLIArguments,
    userConfig: AgentTARSAppConfig,
  ): AgentTARSAppConfig {
    return ConfigBuilder.buildAppConfig<AgentTARSCLIArguments, AgentTARSAppConfig>(
      cliArguments,
      userConfig,
      (cliArguments, appConfig) => {
        const { browserControl, browserCdpEndpoint } = cliArguments;

        // Handle deprecated Agent TARS browser options
        if (browserControl || browserCdpEndpoint) {
          // Ensure browser config exists
          const agentTARSConfig = appConfig;
          if (!agentTARSConfig.browser) {
            agentTARSConfig.browser = {};
          }

          // Handle deprecated --browserControl option
          if (browserControl && !agentTARSConfig.browser.control) {
            agentTARSConfig.browser.control = browserControl as BrowserControlMode;
          }

          // Handle deprecated --browserCdpEndpoint option
          if (browserCdpEndpoint && !agentTARSConfig.browser.cdpEndpoint) {
            agentTARSConfig.browser.cdpEndpoint = browserCdpEndpoint;
          }
        }
      },
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
