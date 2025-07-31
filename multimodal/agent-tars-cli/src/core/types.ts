/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from '@multimodal/agent-server-interface';

/**
 * Command handler interface
 * Defines the structure for command handlers that process CLI commands
 */
export interface CommandHandler {
  /**
   * Execute the command with given options
   *
   * @param options Command options from CLI
   * @returns Promise that resolves when command completes
   */
  execute(options: Record<string, any>): Promise<void>;
}

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
