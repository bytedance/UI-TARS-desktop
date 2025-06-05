/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSOptions } from '@agent-tars/core';

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
   * Port to run the server on
   * @default 8888
   */
  port?: number;
  
  /**
   * UI mode to use
   * - 'interactive': Full interactive UI
   * - 'none': API server only
   * @default 'interactive'
   */
  uiMode?: 'none' | 'interactive';
  
  /**
   * Agent TARS configuration
   */
  config?: AgentTARSOptions;
  
  /**
   * Path to workspace directory
   */
  workspacePath?: string;
  
  /**
   * Enable debug mode
   */
  isDebug?: boolean;
  
  /**
   * Share provider information
   */
  shareProvider?: string;
  
  /**
   * Snapshot configuration
   */
  snapshot?: {
    enable: boolean;
    snapshotPath: string;
  };
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
