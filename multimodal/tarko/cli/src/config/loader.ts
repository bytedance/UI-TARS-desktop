/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge } from '@multimodal/shared-utils';
import { loadConfig } from '@multimodal/config-loader';
import { AgentAppConfig } from '@multimodal/agent-server-interface';
import fetch from 'node-fetch';
import { logger } from '../utils';
import { CONFIG_FILES } from './paths';

/**
 * Load remote configuration from URL
 *
 * @param url URL to the remote configuration
 * @param isDebug Whether to output debug information
 * @returns Loaded configuration object
 */
async function loadRemoteConfig(url: string, isDebug = false): Promise<AgentAppConfig> {
  try {
    if (isDebug) {
      logger.debug(`Loading remote config from: ${url}`);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch remote config: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    } else {
      console.warn(`Remote config has non-JSON content type: ${contentType}`);
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error(
          `Failed to parse remote config as JSON: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Error loading remote config from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
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
  // Handle no config case - try to load from default locations
  if (!configPaths || configPaths.length === 0) {
    try {
      const { content, filePath } = await loadConfig<AgentAppConfig>({
        cwd: process.cwd(),
        configFiles: CONFIG_FILES,
      });

      if (filePath && isDebug) {
        logger.debug(`Loaded default config from: ${filePath}`);
      }

      return content;
    } catch (err) {
      if (isDebug) {
        logger.debug(
          `Failed to load default configuration: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
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

        if (filePath && isDebug) {
          logger.debug(`Loaded config from: ${filePath}`);
        }

        config = content;
      } catch (err) {
        console.error(
          `Failed to load configuration from ${path}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }
    }

    // Merge with existing config
    mergedConfig = deepMerge(mergedConfig, config);
  }

  return mergedConfig;
}

/**
 * Check if value is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
