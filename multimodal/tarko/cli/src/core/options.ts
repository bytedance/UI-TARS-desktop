/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'cac';
import { AgentCLIArguments } from '@tarko/agent-server-interface';
import { AgentResolutionResult, OptionsConfigurator } from '../types';

export type { AgentCLIArguments };

export const DEFAULT_PORT = 8888;

/**
 * Add common options to a command
 */
export function addCommonOptions(
  command: Command,
  extensionConfigurator?: OptionsConfigurator,
): Command {
  const baseCommand = command
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

                            If not specified, looks for agent.config.{ts,js,json,yml,yaml} in current directory.
      `,
      {
        type: [String],
      },
    )
    .option('--logLevel <level>', 'Log level (debug, info, warn, error)')
    .option('--debug', 'Enable debug mode (show tool calls and system events), highest priority')
    .option('--quiet', 'Reduce startup logging to minimum')

    // Model configuration
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
      `Agent implementation to use

                            Built-in agents or custom agents can be specified.
                            Custom agents should provide path to a module that exports an Agent class.
                              
                            The agent must implement the IAgent interface from @multimodal/agent-interface
      `,
    );

  // Apply extension configurator if provided
  return extensionConfigurator ? extensionConfigurator(baseCommand) : baseCommand;
}

/**
 * Default agent constructor resolver
 */
export async function defaultAgentResolver(agentParam = 'tarko'): Promise<AgentResolutionResult> {
  // Handle default case - try to import from @multimodal/agent
  if (agentParam === 'tarko') {
    try {
      const { Agent } = await import('@multimodal/agent');
      return {
        agentConstructor: Agent,
        agentName: 'Tarko',
      };
    } catch (error) {
      throw new Error(
        `Default agent not available: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
