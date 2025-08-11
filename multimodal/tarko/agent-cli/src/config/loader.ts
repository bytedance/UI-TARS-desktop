/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { deepMerge } from '@tarko/shared-utils';
import { loadConfig } from '@tarko/config-loader';
import { AgentAppConfig } from '@tarko/interface';
import fetch from 'node-fetch';
import chalk from 'chalk';

import { CONFIG_FILES } from './paths';
import {
  displayConfigStart,
  displayConfigLoaded,
  displayConfigError,
  displayDebugInfo,
} from './display';

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
    displayDebugInfo(`Remote config content type`, contentType, isDebug);

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

    displayConfigLoaded(`Remote: ${url}`, Object.keys(config));
    displayDebugInfo(`Remote config keys`, Object.keys(config), isDebug);

    return config;
  } catch (error) {
    displayConfigError(`Remote: ${url}`, error instanceof Error ? error.message : String(error));
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
  displayConfigStart();

  // Handle no config case - try to load from default locations
  if (!configPaths || configPaths.length === 0) {
    displayDebugInfo('Searching for default config files', CONFIG_FILES, isDebug);

    try {
      const { content, filePath } = await loadConfig<AgentAppConfig>({
        cwd: process.cwd(),
        configFiles: CONFIG_FILES,
      });

      if (filePath) {
        displayConfigLoaded(`Default: ${filePath}`, Object.keys(content));
        displayDebugInfo(`Default config keys`, Object.keys(content), isDebug);
      }

      return content;
    } catch (err) {
      displayConfigError('Default config search', err instanceof Error ? err.message : String(err));
      return {};
    }
  }

  let mergedConfig: AgentAppConfig = {};
  const loadedSources: string[] = [];
  const failedSources: string[] = [];

  // Process each config path in order, merging sequentially
  for (const [index, path] of configPaths.entries()) {
    displayDebugInfo(
      `Processing config source [${index + 1}/${configPaths.length}]`,
      path,
      isDebug,
    );
    let config: AgentAppConfig = {};

    if (isUrl(path)) {
      // Load from URL
      config = await loadRemoteConfig(path, isDebug);
      if (Object.keys(config).length > 0) {
        loadedSources.push(`${path} (remote)`);
      } else {
        failedSources.push(`${path} (remote)`);
      }
    } else {
      // Load from file
      try {
        const { content, filePath } = await loadConfig<AgentAppConfig>({
          cwd: process.cwd(),
          path,
        });

        if (filePath) {
          displayConfigLoaded(filePath, Object.keys(content));
          displayDebugInfo(`Config keys from ${filePath}`, Object.keys(content), isDebug);
          loadedSources.push(filePath);
        }

        config = content;
      } catch (err) {
        displayConfigError(path, err instanceof Error ? err.message : String(err));
        failedSources.push(path);
        continue;
      }
    }

    // Merge with existing config
    const beforeMergeKeys = Object.keys(mergedConfig);
    mergedConfig = deepMerge(mergedConfig, config);
    const afterMergeKeys = Object.keys(mergedConfig);

    if (isDebug && Object.keys(config).length > 0) {
      const newKeys = afterMergeKeys.filter((configKey) => !beforeMergeKeys.includes(configKey));
      const overriddenKeys = beforeMergeKeys.filter(
        (configKey) =>
          Object.keys(config).includes(configKey) &&
          JSON.stringify((mergedConfig as any)[configKey]) !==
            JSON.stringify((config as any)[configKey]),
      );

      if (newKeys.length > 0) {
        displayDebugInfo(`New config keys added`, newKeys, isDebug);
      }
      if (overriddenKeys.length > 0) {
        displayDebugInfo(`Config keys merged/overridden`, overriddenKeys, isDebug);
      }
    }
  }

  // Display final summary
  if (loadedSources.length > 0) {
    console.log(
      '\n' +
        chalk.bold.green('✅ ') +
        chalk.bold(
          `Loaded ${loadedSources.length} config source${loadedSources.length > 1 ? 's' : ''}`,
        ),
    );
  }

  if (failedSources.length > 0) {
    console.log(
      chalk.bold.yellow('⚠️  ') +
        chalk.italic(
          `Failed to load ${failedSources.length} source${failedSources.length > 1 ? 's' : ''}`,
        ),
    );
  }

  displayDebugInfo(`Final merged config keys`, Object.keys(mergedConfig), isDebug);

  return mergedConfig;
}

/**
 * Check if value is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}
