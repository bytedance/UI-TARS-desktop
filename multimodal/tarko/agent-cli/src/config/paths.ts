/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'path';
import * as fs from 'fs';
import { logDebugInfo } from './display';

/**
 * Default configuration files that will be automatically detected
 * The first file found in this list will be used if no explicit config is provided
 */
export const CONFIG_FILES = ['tarko.config.ts', 'tarko.config.yaml', 'tarko.config.json'];

/**
 * Build configuration paths array by combining CLI options and workspace settings
 *
 * Priority order (highest to lowest):
 * L0: CLI Arguments (handled separately)
 * L1: Workspace Config File
 * L2: CLI Config Files
 * L3: CLI Remote Config
 * L4: CLI Node API Config (handled separately)
 *
 * @param options Configuration options
 * @param options.cliConfigPaths Array of config paths from CLI arguments (L2)
 * @param options.remoteConfig Remote config from bootstrap options (L3)
 * @param options.workspace Path to workspace for L1 config
 * @param options.isDebug Debug mode flag
 * @returns Array of configuration paths in priority order (lowest to highest)
 */
export function buildConfigPaths({
  cliConfigPaths = [],
  remoteConfig,
  workspace,
  isDebug = false,
}: {
  cliConfigPaths?: string[];
  remoteConfig?: string;
  workspace?: string;
  isDebug?: boolean;
}): string[] {
  const configPaths: string[] = [];

  // L3: Remote config has lower priority
  if (remoteConfig) {
    configPaths.push(remoteConfig);
    logDebugInfo(`Adding remote config`, remoteConfig, isDebug);
  }

  // L2: CLI config files
  if (cliConfigPaths.length > 0) {
    configPaths.push(...cliConfigPaths);
    logDebugInfo(`Adding CLI config paths`, cliConfigPaths, isDebug);
  }

  // L1: Workspace config file (highest priority among config files)
  if (workspace) {
    for (const file of CONFIG_FILES) {
      const configPath = path.join(workspace, file);
      if (fs.existsSync(configPath)) {
        configPaths.push(configPath);
        logDebugInfo(`Found workspace config`, configPath, isDebug);
        break;
      }
    }
  }

  logDebugInfo(`Config search paths`, configPaths, isDebug);

  return configPaths;
}
