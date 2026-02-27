/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentModel, ModelProviderName, BaseModelProviderName } from './types';
import { HIGH_LEVEL_MODEL_PROVIDER_CONFIGS } from './constants';
import { addClaudeHeadersIfNeeded } from './claude-headers';
import { addAzureClaudeParamsIfNeeded } from './azure-claude-params';
import { models } from '@tarko/llm-client';

/**
 * Known base model providers from llm-client
 */
const KNOWN_BASE_PROVIDERS = new Set(Object.keys(models));

/**
 * Get the actual provider implementation name
 * For unknown providers (like 'kimi'), defaults to 'openai-compatible'
 */
function getActualProvider(providerName: ModelProviderName): BaseModelProviderName {
  // First check if there's a high-level config that extends a base provider
  const config = HIGH_LEVEL_MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
  if (config?.extends) {
    return config.extends;
  }

  // If the provider is a known base provider, use it directly
  if (KNOWN_BASE_PROVIDERS.has(providerName)) {
    return providerName as BaseModelProviderName;
  }

  // For unknown providers, default to 'openai-compatible'
  // This handles custom providers like 'kimi' that use OpenAI-compatible APIs
  return 'openai-compatible';
}

/**
 * Get default configuration for a provider
 */
function getDefaultConfig(providerName: ModelProviderName) {
  return HIGH_LEVEL_MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
}

/**
 * Resolves the model configuration based on run options and defaults
 * FIXME: Remove `runModel`.
 *
 * @param agentModel - Default model configuration from agent options
 * @param runModel - Model specified in run options (optional)
 * @param runProvider - Provider specified in run options (optional)
 * @returns Resolved model configuration
 */
export function resolveModel(
  agentModel?: AgentModel,
  runModel?: string,
  runProvider?: ModelProviderName,
): AgentModel {
  // Start with runtime parameters, fall back to agent model configuration
  const provider = runProvider || agentModel?.provider || 'openai';
  const model = runModel || agentModel?.id || 'gpt-4o';

  let baseURL = agentModel?.baseURL;
  let apiKey = agentModel?.apiKey;
  const displayName = agentModel?.displayName;

  // Apply default configuration from constants if missing
  const defaultConfig = getDefaultConfig(provider);
  if (defaultConfig) {
    baseURL = baseURL || defaultConfig.baseURL;
    apiKey = apiKey || defaultConfig.apiKey;
  }

  // Automatically add Claude headers if it's a Claude model
  const headers = addClaudeHeadersIfNeeded(model, agentModel?.headers);

  // Automatically add Azure Claude params if needed
  const params = addAzureClaudeParamsIfNeeded(model, provider, agentModel?.params);

  return {
    provider,
    id: model,
    displayName,
    baseURL,
    apiKey,
    headers,
    params,
    baseProvider: getActualProvider(provider),
  };
}
