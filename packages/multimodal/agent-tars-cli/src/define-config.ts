/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentTARSOptions } from '@agent-tars/core';

/**
 * Helper function for defining Agent TARS configuration with TypeScript type checking.
 *
 * @example
 * ```ts
 * // agent-tars.config.ts
 * import { defineConfig } from '@agent-tars/cli/config';
 *
 * export default defineConfig({
 *   model: {
 *     providers: [
 *       {
 *         name: 'openai',
 *         apiKey: process.env.OPENAI_API_KEY,
 *       }
 *     ]
 *   },
 *   // Other options...
 * });
 * ```
 *
 * @param config The Agent TARS configuration object
 * @returns The typed configuration object
 */
export function defineConfig(config: AgentTARSOptions): AgentTARSOptions {
  return config;
}
