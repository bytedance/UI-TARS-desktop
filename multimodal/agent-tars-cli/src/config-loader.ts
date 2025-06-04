/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadConfig } from '@multimodal/config-loader';
import { AgentTARSOptions } from '@agent-tars/core';

// List of config files to search for automatically
export const CONFIG_FILES = [
  'agent-tars.config.ts',
  'agent-tars.config.yml',
  'agent-tars.config.yaml',
  'agent-tars.config.json',
  'agent-tars.config.js',
];

/**
 * Load configuration from file
 */
export async function loadTarsConfig(
  configPath?: string,
  isDebug = false,
): Promise<AgentTARSOptions> {
  try {
    const { content, filePath } = await loadConfig<AgentTARSOptions>({
      cwd: process.cwd(),
      path: configPath,
      configFiles: CONFIG_FILES,
    });

    if (filePath && isDebug) {
      console.log(`Loaded config from: ${filePath}`);
    }

    return content;
  } catch (err) {
    console.error(
      `Failed to load configuration: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {};
  }
}
