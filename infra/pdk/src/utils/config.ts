/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Configuration loader for PDK
 */

import { loadConfig } from '@tarko/config-loader';
import type { LoadConfigOptions } from '@tarko/config-loader';
import { join } from 'path';

import type { PDKConfig, LoadedConfig } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<PDKConfig> = {
  // Core operational defaults
  cwd: process.cwd(),
  dryRun: false,        // Opt-in safety feature
  runInBand: false,      // Optimize for speed by default
  ignoreScripts: false,   // Respect build scripts by default
  tagPrefix: 'v',        // Most common git tag convention
  commit: true,          // Most common git tag convention
  
  // AI defaults - opt-in for security and cost reasons
  useAi: false,         // Prevent unexpected API calls/costs
  provider: 'openai',    // Most common LLM provider
  model: 'gpt-4o',      // Current best general-purpose model
  
  // Chelog filtering defaults
  filterScopes: [],      // Include all scopes by default
  filterTypes: ['feat', 'fix'],  // Most important change types
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
): T {
  return {
    ...config.resolved,
    ...cliOptions,
  } as T;
}