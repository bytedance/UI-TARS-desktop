/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLogger } from '@tarko/shared-utils';
import { AgentModel, LLMRequestInterceptor } from '@tarko/model-provider';
import { createLLMClient, LLMReasoningOptions } from '@tarko/model-provider';

const logger = getLogger('ModelProvider');

/**
 * Get LLM Client based on current model configuration
 *
 * @param currentModel Resolved model configuration
 * @param reasoningOptions Reasoning options
 * @param requestInterceptor Optional request interceptor
 * @returns OpenAI-compatible client
 */
export function getLLMClient(
  currentModel: AgentModel,
  reasoningOptions: LLMReasoningOptions,
  requestInterceptor?: LLMRequestInterceptor,
) {
  const { provider, id, baseProvider, baseURL } = currentModel;

  logger.info(`Creating LLM client: 
- Provider: ${provider} 
- Model: ${id} 
- Actual Provider: ${baseProvider} 
- Base URL: ${baseURL || 'default'} 
`);

  return createLLMClient(currentModel, (provider, request, baseURL) => {
    // Add reasoning options for compatible providers
    if (provider !== 'openai') {
      request.thinking = reasoningOptions;
    }

    // Apply custom request interceptor if provided
    return requestInterceptor ? requestInterceptor(provider, request, baseURL) : request;
  });
}
