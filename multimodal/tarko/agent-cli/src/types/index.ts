/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CAC, Command } from 'cac';
import { AgentServerInitOptions } from '@tarko/agent-server';

export type { AgentServerInitOptions };

export { CAC as CLIInstance, Command as CLICommand };

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
 * Agent CLI Instantiation Options
 */
export interface AgentCLIInitOptions extends AgentServerInitOptions {
  /**
   * Binary name
   */
  binName?: string;

  /**
   * Remote configuration URL
   */
  remoteConfig?: string;
}

export interface AgentCLICoreCommandBaseOptions {
  /**
   * Agent Server Initialization Options
   */
  agentServerInitOptions: AgentServerInitOptions;
  /**
   * Whether to enable debug mode
   */
  isDebug?: boolean;
}

/**
 * Run options for `run` command
 */
export interface AgentCLIRunCommandOptions extends AgentCLICoreCommandBaseOptions {
  input: string;
  format?: 'json' | 'text';
  includeLogs?: boolean;
}

/**
 * Run options for `serve` command
 */
export interface AgentCLIServeCommandOptions extends AgentCLICoreCommandBaseOptions {}

/**
 * Run options for `start` command
 */
export interface AgentCLIRunInteractiveUICommandOptions extends AgentCLICoreCommandBaseOptions {
  /**
   * Whether to open dev server.
   */
  open?: boolean;
}
