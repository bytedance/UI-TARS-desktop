/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Model,
  OpenAI,
  AzureOpenAI,
  OpenAIToolCallProvider,
  InstructionToolCallProvider,
} from '../src';

export type ModelName =
  | 'gpt-4o-2024-11-20'
  | 'aws_sdk_claude37_sonnet'
  | 'qwen2.5-coder-3b-instruct'
  | 'qwen2.5-7b-instruct-1m';

export function getModel(name: ModelName) {
  if (
    name === 'qwen2.5-coder-3b-instruct' ||
    name === 'qwen2.5-7b-instruct-1m'
  ) {
    const apiKey = 'openai';
    const openai = new OpenAI({
      baseURL: 'http://127.0.0.1:1234/v1',
      apiKey,
    });
    return new Model(openai, name);
  }

  if (name === 'gpt-4o-2024-11-20') {
    const apiKey = 'openai';
    console.log(
      'process.env.OPENAI_API_BASE_URL',
      process.env.OPENAI_API_BASE_URL,
    );

    const openai = new OpenAI({
      baseURL: process.env.OPENAI_API_BASE_URL,
      apiKey,
      defaultHeaders: {
        'api-key': apiKey,
      },
    });
    return new Model(openai, 'gpt-4o-2024-11-20');
  }

  if (name === 'aws_sdk_claude37_sonnet') {
    const openai = new AzureOpenAI({
      endpoint: process.env.AWS_CLAUDE_API_BASE_URL,
      apiKey: 'claude',
      apiVersion: 'claude',
      dangerouslyAllowBrowser: true,
    });
    return new Model(openai, 'aws_sdk_claude37_sonnet');
  }

  throw new Error(`Unknown model name: ${name}`);
}

// Helper function to get appropriate tool call provider for a model
export function getToolCallProvider(model: Model) {
  if (model.name.toLowerCase().includes('claude')) {
    return new InstructionToolCallProvider();
  }

  // Default to OpenAI provider
  return new OpenAIToolCallProvider();
}
