/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadConfig } from '@multimodal/config-loader';
import { AgentTARSAppConfig } from '@agent-tars/interface';
import fetch from 'node-fetch';
import { logger } from '../utils';
import { CONFIG_FILES } from './paths';

/**
 * Load remote configuration from URL
 *
 * Fetches configuration from a remote URL and parses it based on its content type.
 * Supports JSON content type by default and attempts to parse text responses as JSON.
 *
 * @param url URL to the remote configuration
 * @param isDebug Whether to output debug information
 * @returns Loaded configuration object
 * @throws Error if fetching or parsing fails
 */
async function loadRemoteConfig(url: string, isDebug = false): Promise<AgentTARSAppConfig> {
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
      // For text configs, we'll assume it's JSON but log a warning
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
 * @param str String to check
 * @returns True if the string is a valid URL, false otherwise
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
 *
 * This function handles loading Agent TARS configuration from multiple sources:
 * 1. Auto-detected configuration files in the current directory (if no explicit path provided)
 * 2. Local configuration files specified via paths
 * 3. Remote configuration from URLs
 *
 * When multiple configurations are provided, they are merged sequentially with
 * later configs taking precedence over earlier ones.
 *
 * @param configPaths Path(s) to config files or URL(s), can be a string array
 * @param isDebug Whether to output debug information
 * @returns Merged configuration object
 *
 * @example
 * // Load from default configuration file in current directory
 * const config = await loadTarsConfig();
 *
 * @example
 * // Load from specific local file
 * const config = await loadTarsConfig(['./my-config.json']);
 *
 * @example
 * // Load from remote URL
 * const config = await loadTarsConfig(['https://example.com/config.json']);
 *
 * @example
 * // Load and merge multiple configurations
 * const config = await loadTarsConfig([
 *   './base-config.json',
 *   'https://example.com/overrides.json'
 * ]);
 */
export async function loadTarsConfig(
  configPaths?: string[],
  isDebug = false,
): Promise<AgentTARSAppConfig> {
  // Handle no config case - try to load from default locations
  if (!configPaths || configPaths.length === 0) {
    try {
      const { content, filePath } = await loadConfig<AgentTARSAppConfig>({
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

  let mergedConfig: AgentTARSAppConfig = {};

  // Process each config path in order, merging sequentially
  for (const path of configPaths) {
    let config: AgentTARSAppConfig = {};

    if (isUrl(path)) {
      // Load from URL
      config = await loadRemoteConfig(path, isDebug);
    } else {
      // Load from file
      try {
        const { content, filePath } = await loadConfig<AgentTARSAppConfig>({
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
        continue; // Skip this config and move to next
      }
    }

    // Merge with existing config (later configs override earlier ones)
    mergedConfig = deepMerge(mergedConfig, config);
  }

  return mergedConfig;
}

/**
 * Deep merge two objects with the second taking precedence
 *
 * This function recursively merges properties from the source object into the target object.
 * For nested objects, it performs a deep merge. For arrays and primitive values, it replaces
 * the target value with the source value.
 *
 * @param target Target object to merge into
 * @param source Source object to merge from (takes precedence)
 * @returns A new merged object
 */
export function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if value is an object (not an array or null)
 * @param item Value to check
 * @returns True if the value is an object, false otherwise
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
