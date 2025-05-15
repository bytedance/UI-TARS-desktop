/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * This config is used for internal testing only, DO NOT reply on it.
 */
import { ModelProvider } from '../../src';

export const TEST_MODEL_PROVIDERS: ModelProvider[] = [
  {
    name: 'volcengine',
    apiKey: process.env.ARK_API_KEY,
    models: [
      'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
    ],
  },
  {
    name: 'volcengine',
    apiKey: process.env.ARK_API_KEY,
    models: [
      'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
    ],
  },
  {
    name: 'azure-openai',
    baseURL: process.env.AWS_CLAUDE_API_BASE_URL,
    models: ['aws_sdk_claude37_sonnet'],
  },
  {
    name: 'lm-studio',
    models: ['qwen2.5-coder-3b-instruct', 'qwen2.5-7b-instruct-1m'],
  },
  {
    name: 'ollama',
    models: ['qwen3:1.7b'],
  },
  {
    name: 'openai',
    baseURL: process.env.OPENAI_API_BASE_URL,
    models: ['gpt-4o-2024-11-20'],
  },
];
