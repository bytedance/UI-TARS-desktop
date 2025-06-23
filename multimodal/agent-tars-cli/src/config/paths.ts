/* eslint-disable @typescript-eslint/no-explicit-any */
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
export const CONFIG_FILES = [
  'agent-tars.config.ts',
  // 'agent-tars.config.yml',
  'agent-tars.config.yaml',
  'agent-tars.config.json',
  // 'agent-tars.config.js',
];

/**
 * Build configuration paths array by combining CLI options, bootstrap config and workspace settings
 *
 * @param options Configuration options
 * @param options.cliConfigPaths Array of config paths from CLI arguments
 * @param options.bootstrapRemoteConfig Remote config from bootstrap options
 * @param options.useGlobalWorkspace Whether global workspace should be used
 * @param options.globalWorkspacePath Path to global workspace
 * @param options.isDebug Debug mode flag
 * @returns Array of configuration paths in priority order
 */
export function buildConfigPaths({
  cliConfigPaths = [],
  bootstrapRemoteConfig,
  useGlobalWorkspace,
  globalWorkspacePath,
  isDebug = false,
}: {
  cliConfigPaths?: string[];
  bootstrapRemoteConfig?: string;
  useGlobalWorkspace?: boolean;
  globalWorkspacePath?: string;
  isDebug?: boolean;
}): string[] {
  const configPaths: string[] = [...cliConfigPaths];

  // bootstrapCliOptions has lowest priority
  if (bootstrapRemoteConfig) {
    configPaths.unshift(bootstrapRemoteConfig);
  }

  // Add global workspace config if it exists and is enabled
  if (useGlobalWorkspace && globalWorkspacePath) {
    let foundWorkspaceConfig = false;

    for (const file of CONFIG_FILES) {
      const configPath = path.join(globalWorkspacePath, file);
      if (fs.existsSync(configPath)) {
        logger.debug(`Load global workspace config: ${configPath}`);
        // Config file in global workspace should have highest priority
        configPaths.push(configPath);
        foundWorkspaceConfig = true;
        break;
      }
    }

    if (!foundWorkspaceConfig && isDebug) {
      logger.debug(`No config file found in global workspace: ${globalWorkspacePath}`);
    }

    if (isDebug) {
      logger.debug(`Added global workspace configs: ${globalWorkspacePath}`);
    }
  }

  return configPaths;
}
