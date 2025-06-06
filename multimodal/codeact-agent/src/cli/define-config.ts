/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CodeActAgentOptions } from '../code-act-agent';

/**
 * Helper function for defining CodeAct CLI configuration with TypeScript type checking.
 *
 * @example
 * ```ts
 * // codeact.config.ts
 * import { defineConfig } from '@multimodal/codeact-agent/cli/config';
 *
 * export default defineConfig({
 *   workspace: './my-workspace',
 *   enableNodeCodeAct: true,
 *   enablePythonCodeAct: true,
 *   cleanupOnExit: true,
 * });
 * ```
 *
 * @param config The CodeAct configuration object
 * @returns The typed configuration object
 */
export function defineConfig(config: CodeActAgentOptions): CodeActAgentOptions {
  return config;
}
