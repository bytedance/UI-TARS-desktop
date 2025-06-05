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
 *     ],
 *     use: {
 *       provider: 'openai',
 *       model: 'gpt-4o',
 *     }
 *   },
 *   // Other options...
 * });
 * ```
 *
 * When using the CLI, you can specify this configuration file with:
 * ```bash
 * tars --config ./agent-tars.config.ts
 * ```
 *
 * Or use multiple configuration files with values from later files taking precedence:
 * ```bash
 * tars --config ./base-config.json --config ./project-specific.yml
 * ```
 *
 * You can also use remote configuration URLs:
 * ```bash
 * tars --config https://example.com/shared-config.json
 * ```
 *
 * @param config The Agent TARS configuration object
 * @returns The typed configuration object
 */
export function defineConfig(config: AgentTARSOptions): AgentTARSOptions {
  return config;
}
