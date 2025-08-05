/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentAppConfig } from './config';

/**
 * Helper function for defining Agent TARS application configuration with TypeScript type checking.
 *
 * @example
 * ```ts
 * // tarko.config.ts
 * import { defineConfig } from '@tarko/interface';
 *
 * export default defineConfig({
 *   model: {
 *     provider: 'openai',
 *     id: 'gpt-4o',
 *   },
 *   server: {
 *     port: 8888,
 *     storage: {
 *       type: 'sqlite',
 *     },
 *   },
 *   // Other options...
 * });
 * ```
 *
 * @param config The Agent application configuration object
 * @returns The typed configuration object
 */
export function defineConfig<T extends AgentAppConfig>(config: T): T {
  return config;
}
