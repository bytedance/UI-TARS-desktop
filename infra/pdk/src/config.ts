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
 * 
 * @example
 * ```typescript
 * import { defineConfig } from 'pnpm-dev-kit';
 * 
 * export default defineConfig({
 *   common: {
 *     tagPrefix: 'v',
 *     dryRun: false,
 *   },
 *   ai: {
 *     useAi: true,
 *     model: 'gpt-4o',
 *     provider: 'openai',
 *   },
 *   filter: {
 *     filterTypes: ['feat', 'fix', 'perf'],
 *     filterScopes: ['core', 'ui'],
 *   },
 *   release: {
 *     changelog: true,
 *     pushTag: true,
 *     createGithubRelease: true,
 *   },
 *   changelog: {
 *     beautify: true,
 *     commit: true,
 *   },
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