/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLogger } from '../utils/logger';
import { ResolvedModel } from '@multimodal/model-provider';
import { createLLMClient, LLMReasoningOptions, LLMRequest } from '@multimodal/model-provider';

const logger = getLogger('ModelProvider');

/**
 * Get LLM Client based on resolved model configuration
 *
 * @param resolvedModel Resolved model configuration
 * @param reasoningOptions Reasoning options
 * @returns OpenAI-compatible client
 */
export function getLLMClient(resolvedModel: ResolvedModel, reasoningOptions: LLMReasoningOptions) {
  const { provider, id, actualProvider, baseURL } = resolvedModel;

  logger.info(`Creating LLM client: 
- Provider: ${provider} 
- Model: ${id} 
- Actual Provider: ${actualProvider} 
- Base URL: ${baseURL || 'default'} 
`);

  return createLLMClient(resolvedModel, (provider, request, baseURL) => {
    if (provider !== 'openai') {
      request.thinking = reasoningOptions;
    }
    return request;
  });
}
