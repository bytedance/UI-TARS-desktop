/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Configuration definition utilities for PDK
 */

import type { PDKConfig } from './types';

/**
 * Defines PDK configuration with TypeScript support
 * CLI, Node.js API, and Config API are completely isomorphic
 * 
 * @example
 * ```typescript
 * import { defineConfig } from 'pnpm-dev-kit';
 * 
 * export default defineConfig({
 *   // Common options shared across all commands
 *   tagPrefix: 'v',
 *   dryRun: false,
 *   runInBand: false,
 *   ignoreScripts: false,
 *   
 *   // AI-related options for changelog generation
 *   useAi: true,
 *   model: 'gpt-4o',
 *   provider: 'openai',
 *   // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
 *   apiKey: process.env.OPENAI_API_KEY,
 *   
 *   // Filter options for changelog generation
 *   filterTypes: ['feat', 'fix', 'perf'],
 *   filterScopes: ['core', 'ui'],
 *   
 *   // Development mode configuration (dev command only)
 *   exclude: ['@scope/package-to-exclude'],
 *   packages: ['@scope/package-to-start'],
 *   
 *   // Release command configuration (release command only)
 *   changelog: true,
 *   pushTag: true,
 *   createGithubRelease: true,
 *   
 *   // Changelog command configuration (changelog command only)
 *   beautify: true,
 *   commit: true,
 * });
 * ```
 */
export function defineConfig(config: PDKConfig): PDKConfig {
  return config;
}

/**
 * Type helper for configuration schema validation
 */
export type ConfigSchema = PDKConfig;