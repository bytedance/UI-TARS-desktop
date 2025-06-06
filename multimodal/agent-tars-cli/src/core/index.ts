/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSOptions } from '@agent-tars/core';
import { startInteractiveCLI } from './interactive';
import { startInteractiveWebUI } from './web-ui';
import { processRequestCommand } from './request';
import { loadTarsConfig } from '../config/loader';

/**
 * Core Agent TARS API for direct usage in Node.js applications
 */
export class AgentTarsAPI {
  /**
   * Start an interactive CLI session with Agent TARS
   *
   * @param config - Agent TARS configuration options
   * @param isDebug - Enable debug mode for verbose output
   * @returns Promise that resolves when the session ends
   */
  static async startCLI(config: AgentTARSOptions = {}, isDebug = false): Promise<void> {
    return startInteractiveCLI(config, isDebug);
  }

  /**
   * Start a web UI server for Agent TARS
   *
   * @param options - Server and UI options
   * @returns Promise that resolves to the HTTP server instance
   */
  static async startWebUI(options: {
    port?: number;
    uiMode?: 'none' | 'interactive';
    config?: AgentTARSOptions;
    workspacePath?: string;
    isDebug?: boolean;
    shareProvider?: string;
    snapshot?: {
      enable: boolean;
      snapshotPath: string;
    };
  }): Promise<any> {
    return startInteractiveWebUI({
      port: options.port || 8888,
      uiMode: options.uiMode || 'interactive',
      config: options.config || {},
      workspacePath: options.workspacePath,
      isDebug: options.isDebug,
      shareProvider: options.shareProvider,
      snapshot: options.snapshot,
    });
  }

  /**
   * Send a direct request to an LLM provider
   *
   * @param options - Request options
   * @returns Promise that resolves when the request is complete
   */
  static async sendRequest(options: {
    provider: string;
    model: string;
    body: string;
    apiKey?: string;
    baseURL?: string;
    stream?: boolean;
    format?: 'raw' | 'semantic';
  }): Promise<void> {
    return processRequestCommand(options);
  }

  /**
   * Load configuration from files or URLs
   *
   * @param configPath - Path(s) to config files or URL(s)
   * @param isDebug - Enable debug output
   * @returns Promise that resolves to the loaded configuration
   */
  static async loadConfig(configPath?: string[], isDebug = false): Promise<AgentTARSOptions> {
    return loadTarsConfig(configPath, isDebug);
  }
}

// Re-export components for direct import
export { startInteractiveCLI } from './interactive';
export { startInteractiveWebUI } from './web-ui';
export { processRequestCommand } from './request';

// Export types
export * from './types';
