/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'cac';
import { AgentCLIArguments, AgentImplementation } from '@tarko/interface';
import { AgioProvider } from '../agio/AgioProvider';

export type { AgentCLIArguments };

export const DEFAULT_PORT = 8888;

/**
 * Add common options to a command
 */
export function addCommonOptions(command: Command): Command {
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

    .option('--tool', 'Tool config including filter options')
    // Tool filtering
    .option(
      '--tool.include <patterns>',
      'Include only tools whose names contain these patterns (comma-separated)',
      {
        type: [String],
      },
    )
    .option(
      '--tool.exclude <patterns>',
      'Exclude tools whose names contain these patterns (comma-separated)',
      {
        type: [String],
      },
    )

    // MCP Server filtering
    .option('--mcpServer', 'MCP server config including filter options')
    .option(
      '--mcpServer.include <patterns>',
      'Include only MCP servers whose names contain these patterns (comma-separated)',
      {
        type: [String],
      },
    )
    .option(
      '--mcpServer.exclude <patterns>',
      'Exclude MCP servers whose names contain these patterns (comma-separated)',
      {
        type: [String],
      },
    )

    // Workspace configuration
    .option('--workspace <path>', 'workspace path')

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

    // Server configuration
    .option('--server', 'Server config')
    .option(
      '--server.exclusive',
      'Enable exclusive mode - reject new requests while an agent is running',
    )

    // Agent selection
    .option(
      '--agent [agent]',
      `Agent implementation to use

                            Built-in agents or custom agents can be specified.
                            Custom agents should provide path to a module that exports an Agent class.
                              
                            The agent must implement the IAgent interface from @tarko/agent-interface
      `,
    );

  return baseCommand;
}

/**
 * Built-in agent mappings
 *
 * Using lazy resolution - resolve module path only when needed
 */
const BUILTIN_AGENTS: Record<string, { modulePath: string; label: string }> = {
  'agent-tars': {
    modulePath: '@agent-tars/core',
    label: 'Agent TARS',
  },
  'omni-tars': {
    modulePath: '@omni-tars/agent',
    label: 'Omni Agent',
  },
  'mcp-agent': {
    modulePath: '@tarko/mcp-agent',
    label: 'MCP Agent',
  },
};

/**
 * Resolve built-in agent module path when needed
 */
function resolveBuiltinAgent(agentName: string): string {
  const agent = BUILTIN_AGENTS[agentName];
  if (!agent) {
    throw new Error(`Unknown built-in agent: ${agentName}`);
  }

  try {
    return require.resolve(agent.modulePath);
  } catch (error: unknown) {
    throw new Error(
      `Failed to resolve built-in agent "${agentName}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * FIXME: Support markdown agent.
 *
 * Resolve agent implementation from cli argument
 */
export async function resolveAgentFromCLIArgument(
  agentParam: string | undefined,
  defaultAgent?: AgentImplementation,
): Promise<AgentImplementation> {
  // Use default agent if no agent parameter provided
  if (agentParam) {
    // Check if it's a built-in agent
    const builtinAgent = BUILTIN_AGENTS[agentParam];
    if (builtinAgent) {
      console.log(`Using built-in agent: ${builtinAgent.label}`);
      return {
        type: 'modulePath',
        value: resolveBuiltinAgent(agentParam),
        label: builtinAgent.label,
        agio: AgioProvider,
      };
    }

    // Otherwise treat as custom module path
    return {
      type: 'modulePath',
      value: agentParam,
      agio: AgioProvider,
    };
  }

  if (defaultAgent) {
    return defaultAgent;
  }

  const { Agent } = await import('@tarko/agent');
  return {
    type: 'module',
    label: 'Tarko',
    constructor: Agent,
    agio: AgioProvider,
  };
}
