import {
  TarkoAgentCLI,
  TarkoAgentCLIOptions,
  printWelcomeLogo,
  type AgentServerExtraOptions,
  CLICommand,
} from '@tarko/agent-cli';
import { AgentTARS } from '@agent-tars/core';
import { CAC } from 'cac';
import { AgioProvider } from './agio/AgioProvider';

const packageJson = require('../package.json');

const DEFAULT_OPTIONS: TarkoAgentCLIOptions = {
  version: packageJson.version,
  buildTime: __BUILD_TIME__,
  gitHash: __GIT_HASH__,
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

  protected extendCli(cli: CAC): void {
    // Base implementation handles all command registration
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
}

export * from './types';
