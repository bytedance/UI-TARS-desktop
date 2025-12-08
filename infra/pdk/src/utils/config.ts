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

import type { PDKConfig, LoadedConfig, CommonOptions, AIOptions, FilterOptions } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_COMMON: CommonOptions = {
  cwd: process.cwd(),
  dryRun: false,
  runInBand: false,
  ignoreScripts: false,
  tagPrefix: 'v',
};

const DEFAULT_AI: AIOptions = {
  useAi: false,
  provider: 'openai',
  model: 'gpt-4o',
};

const DEFAULT_FILTER: FilterOptions = {
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
  // Resolve common options
  const resolvedCommon: CommonOptions = {
    ...DEFAULT_COMMON,
    cwd,
    ...config.common,
  };

  // Resolve AI options
  const resolvedAi: AIOptions = {
    ...DEFAULT_AI,
    ...config.ai,
  };

  // Resolve filter options
  const resolvedFilter: FilterOptions = {
    ...DEFAULT_FILTER,
    ...config.filter,
  };

  return {
    ...config,
    resolvedCommon,
    resolvedAi,
    resolvedFilter,
  };
}

/**
 * Merges CLI options with loaded configuration
 */
export function mergeOptions<T extends Record<string, any>>(
  cliOptions: T,
  config: LoadedConfig,
  commandType: 'dev' | 'release' | 'patch' | 'changelog' | 'githubRelease',
): T {
  const merged: any = {
    // Start with resolved common options
    ...config.resolvedCommon,
    // Add resolved AI options
    ...config.resolvedAi,
    // Add resolved filter options (only for commands that use them)
    ...(commandType === 'release' || commandType === 'changelog' ? config.resolvedFilter : {}),
    // Override with CLI options
    ...cliOptions,
  };

  // Add command-specific configuration
  switch (commandType) {
    case 'dev':
      return { ...merged, ...config.dev };
    case 'release':
      return { ...merged, ...config.release };
    case 'patch':
      return { ...merged, ...config.patch };
    case 'changelog':
      return { ...merged, ...config.changelog };
    case 'githubRelease':
      return { ...merged, ...config.githubRelease };
    default:
      return merged;
  }
}