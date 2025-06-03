/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderConfig } from './types';

/**
 * Default configurations for extended model providers
 */
export const MODEL_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    name: 'ollama',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
  },
  {
    name: 'lm-studio',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:1234/v1',
    apiKey: 'lm-studio',
  },
  {
    name: 'volcengine',
    actual: 'openai',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  {
    name: 'deepseek',
    actual: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
  },
];
