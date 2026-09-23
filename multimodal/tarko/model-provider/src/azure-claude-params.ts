/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

const FINE_GRAINED_TOOL_STREAMING_BETA = 'fine-grained-tool-streaming-2025-05-14';

/**
 * Read the `anthropic_beta` entry a caller already wrote as the list of beta flags it holds
 *
 * @param value - The configured value, if any
 * @returns The caller's flags, empty when there is nothing that can hold flags
 */
function toBetaFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    return value.split(',');
  }

  return [];
}

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
    const betaFeatures = [FINE_GRAINED_TOOL_STREAMING_BETA];
    for (const betaFeature of toBetaFeatures(existingParams?.anthropic_beta)) {
      const feature = betaFeature.trim();
      if (feature && !betaFeatures.includes(feature)) {
        betaFeatures.push(feature);
      }
    }

    return {
      ...existingParams,
      anthropic_beta: betaFeatures,
    };
  }

  return existingParams;
}
