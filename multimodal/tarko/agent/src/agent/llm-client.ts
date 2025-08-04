/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLogger } from '@tarko/shared-utils';
import { ResolvedModel } from '@tarko/model-provider';
import { createLLMClient, LLMReasoningOptions, LLMRequest } from '@tarko/model-provider';

const logger = getLogger('ModelProvider');

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
  reasoningOptions: LLMReasoningOptions,
  requestInterceptor?: (provider: string, request: LLMRequest, baseURL?: string) => any,
) {
  const { provider, id, actualProvider, baseURL } = resolvedModel;

  logger.info(`Creating LLM client: 
- Provider: ${provider} 
- Model: ${id} 
- Actual Provider: ${actualProvider} 
- Base URL: ${baseURL || 'default'} 
`);

  return createLLMClient(resolvedModel, (provider, request, baseURL) => {
    // Add reasoning options for compatible providers
    if (provider !== 'openai') {
      request.thinking = reasoningOptions;
    }

    // Apply custom request interceptor if provided
    return requestInterceptor ? requestInterceptor(provider, request, baseURL) : request;
  });
}
