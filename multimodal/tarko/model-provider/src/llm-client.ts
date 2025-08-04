/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenJS } from '@tarko/llm-client';
import { OpenAI } from 'openai';
import { LLMRequest, ResolvedModel } from './types';

// Providers that should not be added to extended model list
const NATIVE_PROVIDERS = new Set(['openrouter', 'openai-compatible', 'azure-openai']);

/**
 * Create LLM Client based on resolved model configuration
 *
 * @param resolvedModel Resolved model configuration
 * @param requestInterceptor Optional request interceptor for modifying requests
 * @returns OpenAI-compatible client
 */
export function createLLMClient(
  resolvedModel: ResolvedModel,
  requestInterceptor?: (provider: string, request: LLMRequest, baseURL?: string) => any,
): OpenAI {
  const { provider, id, actualProvider, baseURL, apiKey } = resolvedModel;

  const client = new TokenJS({
    apiKey,
    baseURL,
  });

  // Add extended model support for non-native providers
  if (!NATIVE_PROVIDERS.has(actualProvider)) {
    // @ts-expect-error FIXME: support custom provider.
    client.extendModelList(actualProvider, id, {
      streaming: true,
      json: true,
      toolCalls: true,
      images: true,
    });
  }

  // Create OpenAI-compatible interface
  return {
    chat: {
      completions: {
        async create(params: any) {
          const requestPayload = {
            ...params,
            provider,
            model: id,
          };

          const finalRequest = requestInterceptor
            ? requestInterceptor(provider, requestPayload, baseURL)
            : requestPayload;

          return client.chat.completions.create({
            ...finalRequest,
            provider: actualProvider,
          });
        },
      },
    },
  } as unknown as OpenAI;
}
