/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Command } from 'cac';
import { AgentCLIArguments, AgentImplementation } from '@tarko/interface';
import { AgioProvider } from '../agio/AgioProvider';
import { resolveAgentFromNPMInput, analyzeAgentInput } from '@tarko/npm-package-manager';

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

                            Built-in agents, NPM packages, or custom agents can be specified:
                            
                            NPM packages:
                              --agent @omni-tars/agent
                              --agent omni-tars (resolves to tarko-omni-tars)
                              --agent tarko-my-agent
                            
                            Local paths:
                              --agent ./my-agent.js
                              --agent /path/to/agent
                            
                            HTTP URLs:
                              --agent https://example.com/agent.js
                              
                            The agent must implement the IAgent interface from @tarko/agent-interface
      `,
    )
    .option('--update', 'Update NPM agent packages to latest version')
    .option('--tag <tag>', 'NPM package tag to install (default: latest)');

  return baseCommand;
}

/**
 * Resolve agent implementation from cli argument with NPM package support
 */
export async function resolveAgentFromCLIArgument(
  agentParam: string | undefined,
  defaultAgent?: AgentImplementation,
  options?: {
    update?: boolean;
    tag?: string;
  },
): Promise<AgentImplementation> {
  // Use default agent if no agent parameter provided
  if (!agentParam) {
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

  // Analyze the input to determine the best resolution strategy
  const analysis = analyzeAgentInput(agentParam);
  
  // Try NPM package resolution first if it's a candidate
  if (analysis.isNPMCandidate) {
    try {
      const npmAgent = await resolveAgentFromNPMInput(agentParam, {
        update: options?.update,
        tag: options?.tag,
      });
      
      if (npmAgent) {
        return {
          ...npmAgent,
          agio: AgioProvider,
        };
      }
    } catch (error) {
      // If NPM resolution fails, provide helpful error message with suggestions
      const errorMessage = error instanceof Error ? error.message : String(error);
      let message = `Failed to resolve NPM agent '${agentParam}': ${errorMessage}`;
      
      if (analysis.suggestions && analysis.suggestions.length > 0) {
        message += `\n\nDid you mean one of these packages?\n${analysis.suggestions.map(s => `  - ${s}`).join('\n')}`;
      }
      
      throw new Error(message);
    }
  }

  // Fallback to module path resolution for local paths, HTTP URLs, etc.
  return {
    type: 'modulePath',
    value: agentParam,
    agio: AgioProvider,
  };
}
