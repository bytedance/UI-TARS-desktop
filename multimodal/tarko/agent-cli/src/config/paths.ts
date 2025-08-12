/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TARKO_CONSTANTS } from '@tarko/interface';

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
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
 * L2: Global Workspace Config File
 * L3: CLI Config Files
 * L4: CLI Remote Config
 * L5: CLI Node API Config (handled separately)
 *
 * @param options Configuration options
 * @param options.cliConfigPaths Array of config paths from CLI arguments (L3)
 * @param options.remoteConfig Remote config from bootstrap options (L4)
 * @param options.workspace Path to workspace for L1 config
 * @param options.globalWorkspaceEnabled Whether to check global workspace (L2)
 * @param options.globalWorkspaceDir Global workspace directory name
 * @param options.isDebug Debug mode flag
 * @returns Array of configuration paths in priority order (lowest to highest)
 */
export function buildConfigPaths({
  cliConfigPaths = [],
  remoteConfig,
  workspace,
  globalWorkspaceEnabled = false,
  globalWorkspaceDir = TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR,
  isDebug = false,
}: {
  cliConfigPaths?: string[];
  remoteConfig?: string;
  workspace?: string;
  globalWorkspaceEnabled?: boolean;
  globalWorkspaceDir?: string;
  isDebug?: boolean;
}): string[] {
  const configPaths: string[] = [];

  // L4: Remote config has lower priority
  if (remoteConfig) {
    configPaths.push(remoteConfig);
    logDebugInfo(`Adding remote config`, remoteConfig, isDebug);
  }

  // L3: CLI config files
  if (cliConfigPaths.length > 0) {
    configPaths.push(...cliConfigPaths);
    logDebugInfo(`Adding CLI config paths`, cliConfigPaths, isDebug);
  }

  // L2: Global workspace config file
  if (globalWorkspaceEnabled) {
    const globalWorkspacePath = path.join(os.homedir(), globalWorkspaceDir);

    for (const file of CONFIG_FILES) {
      const configPath = path.join(globalWorkspacePath, file);
      if (fs.existsSync(configPath)) {
        configPaths.push(configPath);
        logDebugInfo(`Found global workspace config`, configPath, isDebug);
        break;
      }
    }
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
