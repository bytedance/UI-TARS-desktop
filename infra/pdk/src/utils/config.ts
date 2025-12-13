/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Configuration loader for PDK
 * Uses @tarko/config-loader to load and validate configuration
 */

import { loadConfig, type LoadConfigOptions } from '../utils/config-loader.js';
import type { PDKConfig, LoadedConfig } from '../types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<PDKConfig> = {
  // Core operational defaults
  cwd: process.cwd(),
  dryRun: false,
  runInBand: false,
  ignoreScripts: false,
  tagPrefix: 'v',

  // AI defaults - opt-in for security and cost reasons
  useAi: false,
  provider: 'openai',
  model: 'gpt-4o',

  // Changelog filtering defaults
  filterScopes: [],
  filterTypes: ['feat', 'fix'],
};

/**
 * Configuration loader options
 */
interface PDKConfigLoaderOptions extends Omit<LoadConfigOptions, 'configFiles'> {
  cwd?: string;
}

/**
 * Loads PDK configuration from the specified directory
 * 
 * Priority: CLI > Environment > Config File > Defaults
 */
export async function loadPDKConfig(
  options: PDKConfigLoaderOptions = {},
): Promise<LoadedConfig> {
  const { cwd = process.cwd(), ...loaderOptions } = options;

  try {
    const result = await loadConfig<PDKConfig>({
      ...loaderOptions,
      configFiles: ['pdk.config.ts', 'pdk.config.js', 'pdk.config.mjs', 'pdk.config.cjs'],
      cwd,
    });

    return resolveConfig(result.content, cwd);
  } catch (error) {
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
 * 
 * CLI options override config file options
 */
export function mergeOptions<T extends Record<string, any>>(
  cliOptions: T,
  config: LoadedConfig,
  _commandType: 'dev' | 'release' | 'patch' | 'changelog' | 'githubRelease',
): T {
  return {
    ...config.resolved,
    ...cliOptions,
  } as T;
}