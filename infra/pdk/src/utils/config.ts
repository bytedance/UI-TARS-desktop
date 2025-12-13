/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Configuration loader for PDK
 * Uses @tarko/config-loader to load and validate configuration
 */

import { loadConfig } from '@tarko/config-loader';
import type { LoadConfigOptions } from '@tarko/config-loader';
import { join } from 'path';

import type { PDKConfig, LoadedConfig } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<PDKConfig> = {
  cwd: process.cwd(),
  dryRun: false,
  runInBand: false,
  ignoreScripts: false,
  tagPrefix: 'v',
  useAi: false,
  provider: 'openai',
  model: 'gpt-4o',
  filterScopes: [],
  filterTypes: ['feat', 'fix'],
};

/**
 * Configuration loader options
 */
interface PDKConfigLoaderOptions extends Omit<LoadConfigOptions, 'configFiles'> {
  /**
   * Current working directory
   */
  cwd?: string;
}

/**
 * Loads PDK configuration from the specified directory
 */
export async function loadPDKConfig(
  options: PDKConfigLoaderOptions = {},
): Promise<LoadedConfig> {
  const { cwd = process.cwd(), ...loaderOptions } = options;

  try {
    // Load configuration using @tarko/config-loader
    const result = await loadConfig<PDKConfig>({
      ...loaderOptions,
      configFiles: ['pdk.config.ts', 'pdk.config.js', 'pdk.config.mjs', 'pdk.config.cjs'],
      cwd,
    });

    // Resolve configuration with defaults
    return resolveConfig(result.content, cwd);
  } catch (error) {
    // If config file not found, return default configuration
    if ((error as Error).message.includes('not found')) {
      return resolveConfig({}, cwd);
    }
    throw error;
  }
}

/**
 * Resolves configuration with defaults
 */
function resolveConfig(config: PDKConfig, cwd: string): LoadedConfig {
  const resolved: PDKConfig = {
    ...DEFAULT_CONFIG,
    cwd,
    ...config,
  };

  return {
    ...config,
    resolved,
  };
}

/**
 * Merges CLI options with loaded configuration
 * CLI and Config APIs are now isomorphic, so we can simply merge
 */
export function mergeOptions<T extends Record<string, any>>(
  cliOptions: T,
  config: LoadedConfig,
  _commandType: 'dev' | 'release' | 'patch' | 'changelog' | 'githubRelease',
): T {
  // Simply merge resolved config with CLI options
  // CLI options take precedence over config file options
  return {
    ...config.resolved,
    ...cliOptions,
  } as T;
}