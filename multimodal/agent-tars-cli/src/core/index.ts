/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentTARSAppConfig } from '@agent-tars/interface';
import { startInteractiveCLI } from './interactive-cli';
import { startInteractiveWebUI } from './interactive-ui';

export type { WebUIOptions, RequestOptions, CommandHandler } from './types';

/**
 * Main entry point for starting Agent TARS in various modes
 */
export interface AgentTARSStartOptions {
  /**
   * Application configuration
   */
  config: AgentTARSAppConfig;

  /**
   * Enable debug mode
   */
  debug?: boolean;

  /**
   * UI mode - 'cli' for command line, 'web' for web interface
   */
  mode: 'cli' | 'web';
}

/**
 * Start Agent TARS with the specified configuration and mode
 */
export async function startAgentTARS(options: AgentTARSStartOptions): Promise<void> {
  const { config, debug = false, mode } = options;

  if (mode === 'cli') {
    await startInteractiveCLI(config, debug);
  } else if (mode === 'web') {
    await startInteractiveWebUI({
      appConfig: config,
      isDebug: debug,
    });
  } else {
    throw new Error(`Unsupported mode: ${mode}`);
  }
}
