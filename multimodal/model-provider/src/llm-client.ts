/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenJS } from '@multimodal/llm-client';
import { OpenAI } from 'openai';
import { LLMRequest, ResolvedModel } from './types';

const IGNORE_EXTENDED_PROVIDERS = ['openrouter', 'openai-compatible', 'azure-openai'];

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
  const { provider, model, actualProvider, baseURL, apiKey } = resolvedModel;

  const client = new TokenJS({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  // Add model to extended model list if it's not one of the ignored providers
  if (!IGNORE_EXTENDED_PROVIDERS.includes(actualProvider)) {
    // @ts-expect-error FIXME: support custom provider.
    client.extendModelList(actualProvider, model, {
      streaming: true,
      json: true,
      toolCalls: true,
      images: true,
    });
  }

  // Create an adapter that conforms to the OpenAI interface
  return {
    chat: {
      completions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async create(arg: any) {
          // Prepare the request payload with provider information
          const requestPayload = {
            ...arg,
            provider: provider,
            model,
          };

          // Apply request interceptor if provided
          const finalRequest = requestInterceptor
            ? requestInterceptor(provider, requestPayload, baseURL)
            : requestPayload;

          // Make the actual API call with the actual provider
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
