/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../utils';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Default configuration files that will be automatically detected
 * The first file found in this list will be used if no explicit config is provided
 */
export const CONFIG_FILES = ['agent.config.ts', 'agent.config.yaml', 'agent.config.json'];

/**
 * Build configuration paths array by combining CLI options and workspace settings
 *
 * @param options Configuration options
 * @param options.cliConfigPaths Array of config paths from CLI arguments
 * @param options.remoteConfig Remote config from bootstrap options
 * @param options.workspacePath Path to workspace
 * @param options.isDebug Debug mode flag
 * @returns Array of configuration paths in priority order
 */
export function buildConfigPaths({
  cliConfigPaths = [],
  remoteConfig,
  workspacePath,
  isDebug = false,
}: {
  cliConfigPaths?: string[];
  remoteConfig?: string;
  workspacePath?: string;
  isDebug?: boolean;
}): string[] {
  const configPaths: string[] = [...cliConfigPaths];

  // Remote config has lowest priority
  if (remoteConfig) {
    configPaths.unshift(remoteConfig);
  }

  // Add workspace config if it exists
  if (workspacePath) {
    let foundWorkspaceConfig = false;

    for (const file of CONFIG_FILES) {
      const configPath = path.join(workspacePath, file);
      if (fs.existsSync(configPath)) {
        logger.debug(`Load workspace config: ${configPath}`);
        configPaths.push(configPath);
        foundWorkspaceConfig = true;
        break;
      }
    }

    if (!foundWorkspaceConfig && isDebug) {
      logger.debug(`No config file found in workspace: ${workspacePath}`);
    }
  }

  return configPaths;
}
