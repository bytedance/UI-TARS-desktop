/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenJS } from '@tarko/llm-client';
import { OpenAI } from 'openai';
import { LLMRequest, AgentModel } from './types';
import type { ChatCompletionCreateParamsBase } from './third-party';

// Providers that should not be added to extended model list
const NATIVE_PROVIDERS = new Set(['openrouter', 'openai-compatible', 'azure-openai']);

export type LLMRequestInterceptor = (
  provider: string,
  request: LLMRequest,
  baseURL?: string,
) => ChatCompletionCreateParamsBase;

/**
 * Create LLM Client based on current model configuration
 *
 * @param agentModel Resolved model configuration
 * @param requestInterceptor Optional request interceptor for modifying requests
 * @returns OpenAI-compatible client
 */
export function createLLMClient(
  agentModel: AgentModel,
  requestInterceptor?: LLMRequestInterceptor,
): OpenAI {
  const { provider, id, baseProvider, baseURL, apiKey, headers, params } = agentModel;

  const client = new TokenJS({
    apiKey,
    baseURL,
    defaultHeaders: headers,
  });

  // Add extended model support for non-native providers
  if (baseProvider && !NATIVE_PROVIDERS.has(baseProvider)) {
    // Safely extend model list with type assertion
    const extendableClient = client as unknown as {
      extendModelList: (
        provider: string,
        model: string,
        capabilities: Record<string, boolean>,
      ) => void;
    };

    if (typeof extendableClient.extendModelList === 'function') {
      extendableClient.extendModelList(baseProvider, id, {
        streaming: true,
        json: true,
        toolCalls: true,
        images: true,
      });
    }
  }

  // Create OpenAI-compatible interface
  return {
    chat: {
      completions: {
        async create(requestParams: ChatCompletionCreateParamsBase) {
          const requestPayload = {
            ...requestParams,
            provider,
            model: id,
            // Merge experimental params directly into request body
            ...params,
          };

          const finalRequest = requestInterceptor
            ? requestInterceptor(provider, requestPayload, baseURL)
            : requestPayload;

          return client.chat.completions.create({
            ...finalRequest,
            provider: baseProvider || 'openai',
          });
        },
      },
    },
  } as unknown as OpenAI;
}
