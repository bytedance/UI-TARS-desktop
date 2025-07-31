/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig, AgentConstructor } from '@tarko/agent-server-interface';
import { AgentServerExtraOptions } from '@tarko/agent-server';

export type { AgentServerExtraOptions };

/**
 * Server options for starting the web UI
 */
export interface WebUIOptions {
  /**
   * Complete application configuration
   */
  appConfig: AgentAppConfig;

  /**
   * Enable debug mode
   */
  isDebug?: boolean;

  /**
   * Agent constructor
   */
  agentConstructor: AgentConstructor;

  /**
   * Agent name for display
   */
  agentName: string;

  /**
   * Path to static files for web UI
   */
  staticPath?: string;

  /**
   * Extra options for the agent server
   */
  extraOptions?: AgentServerExtraOptions;
}

/**
 * Request options for sending direct requests to LLM providers
 */
export interface RequestOptions {
  /**
   * LLM provider name
   */
  provider: string;

  /**
   * Model name
   */
  model: string;

  /**
   * Path to request body JSON file or JSON string
   */
  body: string;

  /**
   * Custom API key
   */
  apiKey?: string;

  /**
   * Custom base URL
   */
  baseURL?: string;

  /**
   * Enable streaming mode
   */
  stream?: boolean;

  /**
   * Enable reasoning mode
   */
  thinking?: boolean;

  /**
   * Output format
   * - 'raw': Raw JSON output
   * - 'semantic': Human-readable formatted output
   * @default 'raw'
   */
  format?: 'raw' | 'semantic';
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
 * Bootstrap CLI options
 */
export interface TarkoAgentCLIOptions {
  /**
   * Version string
   */
  version: string;

  /**
   * Build time
   */
  buildTime: number;

  /**
   * Git hash
   */
  gitHash: string;

  /**
   * Binary name
   */
  binName?: string;

  /**
   * Default agent configuration
   */
  defaultAgent?: AgentResolutionResult;

  /**
   * Remote configuration URL
   */
  remoteConfig?: string;
}

/**
 * Run options for silent execution
 */
export interface RunOptions {
  appConfig: AgentAppConfig;
  input: string;
  agentConstructor: AgentConstructor;
  agentName: string;
  format?: 'json' | 'text';
  includeLogs?: boolean;
  isDebug?: boolean;
  agentServerExtraOptions: AgentServerExtraOptions;
}
