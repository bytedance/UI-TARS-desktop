/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Automatically adds anthropic_beta parameters for Azure OpenAI provider with Claude models
 * This is needed for Azure OpenAI's Claude model proxy service
 *
 * @param modelId - The model identifier
 * @param provider - The provider name
 * @param existingParams - Existing experimental parameters
 * @returns Updated parameters with anthropic_beta if applicable
 */
export function addAzureClaudeParamsIfNeeded(
  modelId: string,
  provider: string,
  existingParams?: Record<string, any>,
): Record<string, any> | undefined {
  // Only apply to azure-openai provider with gcp-claude4-sonnet model
  if (provider === 'azure-openai' && modelId === 'gcp-claude4-sonnet') {
    return {
      ...existingParams,
      anthropic_beta: ['fine-grained-tool-streaming-2025-05-14'],
    };
  }

  return existingParams;
}
