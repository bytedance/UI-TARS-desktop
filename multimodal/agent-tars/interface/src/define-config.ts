/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentTARSAppConfig } from './config';

/**
 * Helper function for defining Agent TARS application configuration with TypeScript type checking.
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
 * @param config The Agent TARS application configuration object
 * @returns The typed configuration object
 */
export function defineConfig(config: AgentTARSAppConfig): AgentTARSAppConfig {
  return config;
}
