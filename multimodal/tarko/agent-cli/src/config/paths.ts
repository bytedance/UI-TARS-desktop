/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TARKO_CONSTANTS } from '@tarko/agent-server-interface';
import { logger } from '../utils';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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
 * @param options.workspacePath Path to workspace for L1 config
 * @param options.globalWorkspaceEnabled Whether to check global workspace (L2)
 * @param options.globalWorkspaceDir Global workspace directory name
 * @param options.isDebug Debug mode flag
 * @returns Array of configuration paths in priority order (lowest to highest)
 */
export function buildConfigPaths({
  cliConfigPaths = [],
  remoteConfig,
  workspacePath,
  globalWorkspaceEnabled = false,
  globalWorkspaceDir = TARKO_CONSTANTS.GLOBAL_WORKSPACE_DIR,
  isDebug = false,
}: {
  cliConfigPaths?: string[];
  remoteConfig?: string;
  workspacePath?: string;
  globalWorkspaceEnabled?: boolean;
  globalWorkspaceDir?: string;
  isDebug?: boolean;
}): string[] {
  const configPaths: string[] = [];

  // L4: Remote config has lower priority
  if (remoteConfig) {
    configPaths.push(remoteConfig);
    if (isDebug) {
      logger.debug(`Adding remote config: ${remoteConfig}`);
    }
  }

  // L3: CLI config files
  configPaths.push(...cliConfigPaths);
  if (isDebug && cliConfigPaths.length > 0) {
    logger.debug(`Adding CLI config paths: ${cliConfigPaths.join(', ')}`);
  }

  // L2: Global workspace config file
  if (globalWorkspaceEnabled) {
    const globalWorkspacePath = path.join(os.homedir(), globalWorkspaceDir);
    let foundGlobalConfig = false;

    for (const file of CONFIG_FILES) {
      const configPath = path.join(globalWorkspacePath, file);
      if (fs.existsSync(configPath)) {
        configPaths.push(configPath);
        foundGlobalConfig = true;
        if (isDebug) {
          logger.debug(`Adding global workspace config: ${configPath}`);
        }
        break;
      }
    }

    if (!foundGlobalConfig && isDebug) {
      logger.debug(`No global workspace config found in: ${globalWorkspacePath}`);
    }
  }

  // L1: Workspace config file (highest priority among config files)
  if (workspacePath) {
    let foundWorkspaceConfig = false;

    for (const file of CONFIG_FILES) {
      const configPath = path.join(workspacePath, file);
      if (fs.existsSync(configPath)) {
        configPaths.push(configPath);
        foundWorkspaceConfig = true;
        if (isDebug) {
          logger.debug(`Adding workspace config: ${configPath}`);
        }
        break;
      }
    }

    if (!foundWorkspaceConfig && isDebug) {
      logger.debug(`No config file found in workspace: ${workspacePath}`);
    }
  }

  return configPaths;
}
