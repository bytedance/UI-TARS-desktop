/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { OpenAI } from 'openai';
import { TokenJS } from '@multimodal/llm-client';
import { AgentReasoningOptions, LLMRequest } from '../types';
import { getLogger } from '../utils/logger';
import { ResolvedModel } from '../utils/model-resolver';

const logger = getLogger('ModelProvider');

const IGNORE_EXTENDED_PRIVIDERS = ['openrouter', 'openai-compatible', 'azure-openai'];

// Mock client processing type definition
export type MockLLMClient = {
  chat: {
    completions: {
      create: (arg: any) => any;
    };
  };
};

// Mock configuration interface
interface MockConfig {
  enabled: boolean;
  mockClient: MockLLMClient | null;
}

// Mock configuration object, disabled by default
const mockConfig: MockConfig = {
  enabled: false,
  mockClient: null,
};

/**
 * Enable mock mode for LLM client
 * Only works in test environment (DUMP_AGENT_SNAPSHOP or TEST_AGENT_SNAPSHOP is true)
 *
 * @param mockClient Mock client implementation
 * @returns Whether mock is successfully enabled
 */
export function enableMockLLMClient(mockClient: MockLLMClient): boolean {
  // Allow mocking to be enabled only in test environment
  if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
    mockConfig.enabled = true;
    mockConfig.mockClient = mockClient;
    logger.info('LLM client mock mode enabled');
    return true;
  }
  logger.warn('Attempted to enable LLM client mock mode in non-test environment - ignored');
  return false;
}

/**
 * Disable mock mode for LLM client
 */
export function disableMockLLMClient(): void {
  mockConfig.enabled = false;
  mockConfig.mockClient = null;
  logger.info('LLM client mock mode disabled');
}

/**
 * Get LLM Client based on resolved model configuration
 *
 * @param resolvedModel Resolved model configuration
 * @param reasoningOptions Reasoning options
 * @param requestInterceptor Optional request interceptor
 * @returns OpenAI-compatible client
 */
export function getLLMClient(
  resolvedModel: ResolvedModel,
  reasoningOptions: AgentReasoningOptions,
  requestInterceptor?: (provider: string, request: LLMRequest, baseURL?: string) => any,
) {
  // If mock is enabled and mockClient exists, return the mock client directly
  if (
    (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) &&
    mockConfig.enabled &&
    mockConfig.mockClient
  ) {
    logger.info('Using mock LLM client');
    return mockConfig.mockClient;
  }

  const { provider, model, actualProvider, baseURL, apiKey } = resolvedModel;

  logger.info(`Creating LLM client: 
- Provider: ${provider} 
- Model: ${model} 
- Actual Provider: ${actualProvider} 
- Base URL: ${baseURL || 'default'} 
`);

  const client = new TokenJS({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  if (!IGNORE_EXTENDED_PRIVIDERS.includes(actualProvider)) {
    logger.info(`Extending model list with: ${model}`);
    // @ts-expect-error FIXME: support custom provider.
    client.extendModelList(actualProvider, model, {
      streaming: true,
      json: true,
      toolCalls: true,
      images: true,
    });
  }

  // FIXME: remove as
  // Considering that Token.js is not completely aligned with OpenAI and there are some type issues,
  // in order to decouple the upper and lower layers, we created a duck type to let the outer layer
  // know that this is the OpenAI Client. We need to consider a more reasonable solution later.
  return {
    chat: {
      completions: {
        async create(arg: any) {
          // Prepare the request payload with all necessary information
          const requestPayload: LLMRequest = {
            // Expose the public provider name instead of the internal implementation
            provider: provider,
            ...arg,
            model,
          };

          // Official "OpenAI" endpoint does not support `thinking` field
          if (provider !== 'openai') {
            requestPayload.thinking = reasoningOptions;
          }

          // Apply request interceptor if provided
          const finalRequest = requestInterceptor
            ? requestInterceptor(provider, requestPayload, baseURL)
            : requestPayload;

          logger.info(
            '[LLM Client] Creating chat completion with args: ' +
              JSON.stringify(finalRequest, null, 2),
          );

          const res = await client.chat.completions.create({
            ...finalRequest,
            provider: actualProvider,
          });

          return res;
        },
      },
    },
  } as unknown as OpenAI;
}
