/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARS } from '@agent-tars/core';
import path, { join } from 'path';
import {
  AgentCLI,
  AgentCLIInitOptions,
  printWelcomeLogo,
  CLICommand,
  CLIOptionsEnhancer,
  deepMerge,
} from '@tarko/agent-cli';
import {
  AgentTARSCLIArguments,
  AgentTARSAppConfig,
  BrowserControlMode,
  AGENT_TARS_CONSTANTS,
} from '@agent-tars/interface';
import { homedir } from 'os';

export type { AgentTARSCLIArguments } from '@agent-tars/interface';

const packageJson = require('../package.json');

const DEFAULT_OPTIONS: Partial<AgentCLIInitOptions> = {
  binName: 'agent-tars',
  versionInfo: {
    version: packageJson.version,
    buildTime: __BUILD_TIME__,
    gitHash: __GIT_HASH__,
  },
  appConfig: {
    agent: {
      type: 'module',
      constructor: AgentTARS,
    },
    server: {
      storage: {
        type: 'sqlite',
        baseDir: path.join(homedir(), AGENT_TARS_CONSTANTS.GLOBAL_STORAGE_DIR),
        dbName: AGENT_TARS_CONSTANTS.SESSION_DATA_DB_NAME,
      },
    },
  },
  directories: {
    globalWorkspaceDir: AGENT_TARS_CONSTANTS.GLOBAL_WORKSPACE_DIR,
  },
};

/**
 * Agent TARS CLI - Extends the base CLI with TARS-specific functionality
 */
export class AgentTARSCLI extends AgentCLI {
  constructor(options: AgentCLIInitOptions) {
    const mergedOptions = deepMerge(DEFAULT_OPTIONS, options ?? {});
    super(mergedOptions as AgentCLIInitOptions);
  }

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
   * Create CLI options enhancer for Agent TARS specific options
   * This method only handles the additional options that Agent TARS introduces
   */
  protected configureCLIOptionsEnhancer(): CLIOptionsEnhancer<
    AgentTARSCLIArguments,
    AgentTARSAppConfig
  > {
    return (cliArguments, appConfig) => {
      const { browserControl, browserCdpEndpoint } = cliArguments;

      // Handle deprecated Agent TARS browser options
      if (browserControl || browserCdpEndpoint) {
        // Ensure browser config exists
        const agentTARSConfig = appConfig as Partial<AgentTARSAppConfig>;
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
    };
  }

  /**
   * Print Agent TARS welcome logo with custom dual ASCII art
   */
  protected printLogo(): void {
    const agentArt = [
      ' █████  ██████  ███████ ███    ██ ████████',
      '██   ██ ██      ██      ████   ██    ██   ',
      '███████ ██   ██ █████   ██ ██  ██    ██   ',
      '██   ██ ██   ██ ██      ██  ██ ██    ██   ',
      '██   ██ ███████ ███████ ██   ████    ██   ',
    ].join('\n');

    const tarsArt = [
      '████████  █████  ██████   ███████',
      '   ██    ██   ██ ██   ██  ██     ',
      '   ██    ███████ ██████   ███████',
      '   ██    ██   ██ ██   ██       ██',
      '   ██    ██   ██ ██   ██  ███████',
    ].join('\n');

    printWelcomeLogo(
      'Agent TARS',
      this.getVersionInfo().version,
      'An open-source Multimodal AI Agent',
      [agentArt, tarsArt],
      'https://agent-tars.com',
    );
  }
}
