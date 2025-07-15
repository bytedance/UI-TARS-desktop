import { Command } from 'cac';
import { AgentTARSCLIArguments, AgentTARSAppConfig } from '@agent-tars/interface';
import { logger } from '../utils';
import { loadTarsConfig } from '../config/loader';
import { buildConfigPaths } from '../config/paths';
import { ConfigBuilder } from '../config/builder';
import { getBootstrapCliOptions } from '../core/state';
import { getGlobalWorkspacePath, shouldUseGlobalWorkspace } from './workspace';

export type { AgentTARSCLIArguments };

export const DEFAULT_PORT = 8888;

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
  );
}

/**
 * Process common command options and prepare configuration
 * Handles option parsing, config loading, and merging for reuse across commands
 */
export async function processCommonOptions(options: AgentTARSCLIArguments): Promise<{
  appConfig: AgentTARSAppConfig;
  isDebug: boolean;
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

  logger.debug('Application configuration built from CLI and config files');

  return { appConfig, isDebug };
}
