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
 * 
 * DESIGN NOTES:
 * - These defaults are chosen to work out-of-the-box for most projects
 * - Security-sensitive options (like apiKey) are NOT defaulted to avoid accidents
 * - AI features are opt-in to prevent unexpected API calls
 * - Conservative defaults for potentially destructive operations
 */
const DEFAULT_CONFIG: Partial<PDKConfig> = {
  // Core operational defaults
  cwd: process.cwd(),
  dryRun: false,        // Opt-in safety feature
  runInBand: false,      // Optimize for speed by default
  ignoreScripts: false,   // Respect build scripts by default
  tagPrefix: 'v',        // Most common git tag convention
  
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
  /**
   * Current working directory
   */
  cwd?: string;
}

/**
 * Loads PDK configuration from the specified directory
 * 
 * CONFIGURATION LOADING STRATEGY:
 * 
 * 1. SECURITY FIRST: Never load sensitive data from config files
 *    - API keys should come from environment variables
 *    - Config files are meant for project conventions, not secrets
 * 
 * 2. FALLBACK GRACEFULLY: Missing config files shouldn't break workflows
 *    - Projects can start without any config file
 *    - Defaults provide sensible starting points
 *    - Progressive adoption as teams mature their workflows
 * 
 * 3. TYPE SAFETY: Full TypeScript support with validation
 *    - Config files get autocomplete and type checking
 *    - Runtime validation prevents invalid configurations
 *    - Clear error messages for misconfigurations
 * 
 * 4. PRIORITY RESPECT: CLI > ENV > CONFIG > DEFAULTS
 *    - Temporary overrides via CLI flags
 *    - Environment-specific values via env vars
 *    - Project conventions via config files
 *    - Sensible defaults for everything else
 */
export async function loadPDKConfig(
  options: PDKConfigLoaderOptions = {},
): Promise<LoadedConfig> {
  const { cwd = process.cwd(), ...loaderOptions } = options;

  try {
    // Load configuration using @tarko/config-loader
    // Supports multiple formats: .ts, .js, .mjs, .cjs
    const result = await loadConfig<PDKConfig>({
      ...loaderOptions,
      configFiles: ['pdk.config.ts', 'pdk.config.js', 'pdk.config.mjs', 'pdk.config.cjs'],
      cwd,
    });

    // Resolve configuration with defaults
    return resolveConfig(result.content, cwd);
  } catch (error) {
    // If config file not found, return default configuration
    // This allows projects to work without any config file initially
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
 * MERGE STRATEGY & DESIGN RATIONALE:
 * 
 * 1. ISOMORPHIC DESIGN: CLI and Config APIs use identical structure
 *    - No transformation or mapping required
 *    - Same option names everywhere: --dry-run -> dryRun -> dryRun
 *    - Eliminates confusion between different usage patterns
 * 
 * 2. PRECEDENCE ORDER: CLI > CONFIG > DEFAULTS
 *    - CLI options: Temporary overrides and environment-specific values
 *    - Config file: Project conventions and team preferences
 *    - Defaults: Fallback values for out-of-the-box experience
 * 
 * 3. MERGE SEMANTICS: Simple object spread with clear rules
 *    - Later sources override earlier sources
 *    - No deep merging for complex objects (by design)
 *    - Preserves type safety throughout the process
 * 
 * 4. COMMAND CONTEXT: While all options are available, commands
 *    may only use relevant subsets. This provides flexibility for
 *    advanced use cases without artificial restrictions.
 * 
 * EXAMPLE:
 * Config: { dryRun: false, tagPrefix: 'v' }
 * CLI:    { dryRun: true }
 * Result:  { dryRun: true, tagPrefix: 'v' }
 */
export function mergeOptions<T extends Record<string, any>>(
  cliOptions: T,
  config: LoadedConfig,
  _commandType: 'dev' | 'release' | 'patch' | 'changelog' | 'githubRelease',
): T {
  // Simple spread merge with clear precedence:
  // 1. Start with resolved config (includes defaults)
  // 2. Override with CLI options (temporary/specific values)
  // 3. CLI options win - perfect for testing and environment overrides
  return {
    ...config.resolved,
    ...cliOptions,
  } as T;
}