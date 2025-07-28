import { Command } from 'cac';
import {
  AgentConstructor,
  AgentTARSCLIArguments,
  AgentTARSAppConfig,
} from '@multimodal/agent-server-interface';
import { logger } from '../utils';
import { loadTarsConfig } from '../config/loader';
import { buildConfigPaths } from '../config/paths';
import { ConfigBuilder } from '../config/builder';
import { getBootstrapCliOptions } from '../core/state';
import { getGlobalWorkspacePath, shouldUseGlobalWorkspace } from './workspace';

export type { AgentTARSCLIArguments };

export const DEFAULT_PORT = 8888;

/**
 * Extended CLI arguments with agent selection support
 */
export interface ExtendedCLIArguments extends AgentTARSCLIArguments {
  /**
   * Agent implementation to use
   * Can be a built-in agent name or a path to a custom agent module
   */
  agent?: string;
}

/**
 * Add common options to a command
 * Centralizes option definitions to ensure consistency across commands
 * Uses dot notation that maps directly to nested configuration structure
 */
export function addCommonOptions(command: Command): Command {
  return (
    command
      .option('--port <port>', 'Port to run the server on', { default: DEFAULT_PORT })
      .option('--open', 'Open the web UI in the default browser on server start')
      .option(
        '--config, -c <path>',
        `Path to configuration file(s) or URL(s)

                            Specify one or more configuration files or URLs. Multiple values are merged sequentially,
                            with later files overriding earlier ones. Supports local paths or remote URLs.

                            Examples:
                              --config ./my-config.json
                              --config https://example.com/config.json
                              --config ./base-config.yml --config ./override.json

                            Supported file formats: .ts, .js, .json, .yml, .yaml

                            If not specified, looks for agent-tars.config.{ts,js,json,yml,yaml} in current directory.
      `,
        {
          type: [String],
        },
      )
      .option('--logLevel <level>', 'Log level (debug, info, warn, error)')
      .option('--debug', 'Enable debug mode (show tool calls and system events), highest priority')
      .option('--quiet', 'Reduce startup logging to minimum')

      // Model configuration (CLI parser will automatically handles dot notation)
      .option('--model <model>', 'model provider config')
      .option('--model.provider [provider]', 'LLM provider name')
      .option(
        '--provider [provider]',
        'LLM provider name (deprecated, replaced by `--model.provider`)',
      )
      .option('--model.id [model]', 'Model identifier')
      .option('--model.apiKey [apiKey]', 'Model API key')
      .option('--apiKey [apiKey]', 'Model API key (deprecated, replaced by `--model.apiKey`)')
      .option('--model.baseURL [baseURL]', 'Model base URL')
      .option('--baseURL [baseURL]', 'Model Base URL (deprecated, replaced by `--model.baseURL`)')

      // LLM behavior
      .option('--stream', 'Enable streaming mode for LLM responses')
      .option('--thinking', 'Used to control the reasoning content.')
      .option('--thinking.type [type]', 'Enable reasoning mode for compatible models (enabled)')

      // Tool call engine
      .option(
        '--toolCallEngine [engine]',
        'Tool call engine type (native, prompt_engineering, structured_outputs)',
      )

      // Workspace configuration
      .option('--workspace <workspace>', 'workspace config')
      .option('--workspace.workingDirectory <path>', 'Path to workspace directory')

      // Browser configuration
      .option('--browser <browser>', 'browser config')
      .option(
        '--browser.control [mode]',
        'Browser control mode (mixed, browser-use-only, gui-agent-only)',
      )
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

      // Share configuration
      .option('--share <share>', 'Share config')
      .option('--share.provider [url]', 'Share provider URL')
      .option(
        '--share-provider [url]',
        'Share provider URL (deprecated, replaced by `--share.provider`)',
      )

      // Snapshot configuration
      .option('--snapshot <snapshot>', 'Snapshot config')
      .option('--snapshot.enable', 'Enable agent snapshot functionality')
      .option('--snapshot.snapshotPath <path>', 'Path for storing agent snapshots')

      // Agent selection
      .option(
        '--agent [agent]',
        `Agent implementation to use (default: "agent-tars")

                            Built-in agents:
                              "agent-tars" - General multimodal agent (default)
                              
                            Custom agents:
                              Provide path to a module that exports an Agent class
                              Example: --agent ./my-custom-agent.js
                              
                            The agent must implement the IAgent interface from @multimodal/agent-interface
      `,
        { default: 'agent-tars' },
      )
  );
}

/**
 * Agent resolution result
 */
export interface AgentResolutionResult {
  /**
   * Agent constructor function
   */
  agentConstructor: AgentConstructor;

  /**
   * Agent name for logging
   */
  agentName: string;
}

/**
 * Resolve agent constructor from agent parameter
 */
export async function resolveAgentConstructor(
  agentParam = 'agent-tars',
): Promise<AgentResolutionResult> {
  // Handle built-in agents
  if (agentParam === 'agent-tars') {
    const { AgentTARS } = await import('@agent-tars/core');
    return {
      agentConstructor: AgentTARS,
      agentName: 'Agent TARS',
    };
  }

  // Handle custom agent modules
  try {
    const customAgentModule = await import(agentParam);

    // Look for default export or named exports
    const AgentConstructor =
      customAgentModule.default || customAgentModule.Agent || customAgentModule;

    if (!AgentConstructor || typeof AgentConstructor !== 'function') {
      throw new Error(`Invalid agent module: ${agentParam}. Must export an Agent constructor.`);
    }

    return {
      agentConstructor: AgentConstructor,
      agentName: `Custom Agent (${agentParam})`,
    };
  } catch (error) {
    throw new Error(
      `Failed to load agent "${agentParam}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Process common command options and prepare configuration
 * Handles option parsing, config loading, and merging for reuse across commands
 */
export async function processCommonOptions(options: ExtendedCLIArguments): Promise<{
  appConfig: AgentTARSAppConfig;
  isDebug: boolean;
  agentConstructor: AgentConstructor;
  agentName: string;
}> {
  const bootstrapCliOptions = getBootstrapCliOptions();
  const isDebug = !!options.debug;

  // Build configuration paths using the extracted function
  const configPaths = buildConfigPaths({
    cliConfigPaths: options.config,
    bootstrapRemoteConfig: bootstrapCliOptions.remoteConfig,
    useGlobalWorkspace: shouldUseGlobalWorkspace,
    globalWorkspacePath: shouldUseGlobalWorkspace ? getGlobalWorkspacePath() : undefined,
    isDebug,
  });

  // Load user config from file
  const userConfig = await loadTarsConfig(configPaths, isDebug);

  // Build complete application configuration
  const appConfig = ConfigBuilder.buildAppConfig(options, userConfig);

  // Set logger level if specified
  if (appConfig.logLevel) {
    logger.setLevel(appConfig.logLevel);
  }

  // If global workspace exists, is enabled, and no workspace directory was explicitly specified, use global workspace
  if (shouldUseGlobalWorkspace && !appConfig.workspace?.workingDirectory) {
    if (!appConfig.workspace) {
      appConfig.workspace = {};
    }
    appConfig.workspace.workingDirectory = getGlobalWorkspacePath();
    logger.debug(`Using global workspace directory: ${appConfig.workspace.workingDirectory}`);
  }

  // Resolve agent constructor
  const { agentConstructor, agentName } = await resolveAgentConstructor(options.agent);

  logger.debug(`Using agent: ${agentName}`);
  logger.debug('Application configuration built from CLI and config files');

  return { appConfig, isDebug, agentConstructor, agentName };
}
