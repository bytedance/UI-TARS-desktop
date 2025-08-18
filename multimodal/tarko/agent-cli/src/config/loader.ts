/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge } from '@tarko/shared-utils';
import { loadConfig } from '@tarko/config-loader';
import { AgentAppConfig } from '@tarko/interface';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';

import { CONFIG_FILES } from './paths';
import { logConfigStart, logConfigLoaded, logConfigError, logDebugInfo } from './display';

/**
 * Load remote configuration from URL
 *
 * @param url URL to the remote configuration
 * @param isDebug Whether to output debug information
 * @returns Loaded configuration object
 */
async function loadRemoteConfig(url: string, isDebug = false): Promise<AgentAppConfig> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch remote config: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    let config: AgentAppConfig;
    if (contentType.includes('application/json')) {
      config = await response.json();
    } else {
      const text = await response.text();
      try {
        config = JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Failed to parse remote config as JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    logConfigLoaded(`Remote: ${url}`, Object.keys(config).length, isDebug);
    logDebugInfo(`Remote config keys`, Object.keys(config), isDebug);

    return config;
  } catch (error) {
    logConfigError(`Remote: ${url}`, error instanceof Error ? error.message : String(error));
    return {};
  }
}

/**
 * Load environment variables from .env.local and .env files
 */
export function loadEnvironmentVars(workspace: string, isDebug = false) {
  try {
    // .env.local has higher priority than .env
    const envPaths = [path.join(workspace, '.env.local'), path.join(workspace, '.env')];

    for (const p of envPaths) {
      if (existsSync(p)) {
        dotenv.config({ path: p });
        logDebugInfo('Environment files loaded', p, isDebug);
        return;
      }
    }
  } catch (err) {
    logDebugInfo(
      'No environment files found',
      err instanceof Error ? err.message : String(err),
      isDebug,
    );
  }
}

/**
 * Check if a string is a valid URL
 */
function isUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load configuration from files or URLs
 */
export async function loadAgentConfig(
  configPaths?: string[],
  isDebug = false,
): Promise<AgentAppConfig> {
  logConfigStart(isDebug);

  // Handle no config case - try to load from default locations
  if (!configPaths || configPaths.length === 0) {
    try {
      const { content, filePath } = await loadConfig<AgentAppConfig>({
        cwd: process.cwd(),
        configFiles: CONFIG_FILES,
      });

      if (filePath) {
        logConfigLoaded(filePath, Object.keys(content).length, isDebug);
        logDebugInfo(`Default config keys`, Object.keys(content), isDebug);
      }

      return content;
    } catch (err) {
      logDebugInfo(
        'No default config found',
        err instanceof Error ? err.message : String(err),
        isDebug,
      );
      return {};
    }
  }

  let mergedConfig: AgentAppConfig = {};

  // Process each config path in order, merging sequentially
  for (const path of configPaths) {
    let config: AgentAppConfig = {};

    if (isUrl(path)) {
      // Load from URL
      config = await loadRemoteConfig(path, isDebug);
    } else {
      // Load from file
      try {
        const { content, filePath } = await loadConfig<AgentAppConfig>({
          cwd: process.cwd(),
          path,
        });

        if (filePath) {
          logConfigLoaded(filePath, Object.keys(content).length, isDebug);
          logDebugInfo(`Config keys from ${filePath}`, Object.keys(content), isDebug);
        }

        config = content;
      } catch (err) {
        logConfigError(path, err instanceof Error ? err.message : String(err));
        continue;
      }
    }

    // Merge with existing config
    mergedConfig = deepMerge(mergedConfig, config);
  }

  logDebugInfo(`Final merged config keys`, Object.keys(mergedConfig), isDebug);

  return mergedConfig;
}
