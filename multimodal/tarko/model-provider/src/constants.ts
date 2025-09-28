/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderConfig } from './types';

/**
 * Default configurations for extended model providers
 * These providers are mapped to OpenAI-compatible interfaces
 */
export const HIGH_LEVEL_MODEL_PROVIDER_CONFIGS: readonly ProviderConfig[] = [
  {
    name: 'ollama',
    extends: 'openai',
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
  },
  {
    name: 'lm-studio',
    extends: 'openai',
    baseURL: 'http://127.0.0.1:1234/v1',
    apiKey: 'lm-studio',
  },
  {
    name: 'volcengine',
    extends: 'openai',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  {
    name: 'deepseek',
    extends: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
  },
] as const;
