import { Command } from 'cac';
import { AgentTARSCLIArguments, AgentTARSAppConfig } from '@agent-tars/interface';
import { logger } from '../utils';
import { loadTarsConfig } from '../config/loader';
import { ConfigBuilder } from '../config/builder';
import { getBootstrapCliOptions } from '../core/state';

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

      // Planner configuration
      .option('--planner <planner>', 'Planner config')
      .option('--planner.enabled', 'Enable planning functionality for complex tasks')

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

      // AGIO configuration
      .option('--agio <agio>', 'Agio config')
      .option(
        '--agio.provider <url>',
        `AGIO monitoring provider URL for agent analytics
      
                            When specified, the agent will send standardized monitoring events to the configured
                            endpoint for insights and observability. This includes metrics like execution time,
                            tool usage, loop iterations, and error rates.
                            
                            PRIVACY NOTICE: This cli does not connect to any external server by default.
                            Event transmission only occurs when you explicitly configure this option with a provider URL.
                            
                            Examples:
                              --agio.provider http://localhost:3000/events
                              --agio.provider https://analytics.example.com/api/events
                            
                            For more information about AGIO events and data collection, see the documentation.
      `,
      )
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
  const configPaths = options.config ?? [];

  // Set debug mode flag
  const isDebug = !!options.debug;

  // bootstrapCliOptions has lowest priority
  if (bootstrapCliOptions.remoteConfig) {
    configPaths.unshift(bootstrapCliOptions.remoteConfig);
  }

  // Load user config from file
  const userConfig = await loadTarsConfig(configPaths, isDebug);

  // Build complete application configuration
  const appConfig = ConfigBuilder.buildAppConfig(options, userConfig);

  // Set logger level if specified
  if (appConfig.logLevel) {
    logger.setLevel(appConfig.logLevel);
  }

  logger.debug('Application configuration built from CLI and config files');

  return { appConfig, isDebug };
}
