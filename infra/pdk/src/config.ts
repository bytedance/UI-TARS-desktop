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
 *   tagPrefix: 'v',
 *   useAi: true,
 *   model: 'gpt-4o',
 *   changelog: true,
 *   createGithubRelease: true
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