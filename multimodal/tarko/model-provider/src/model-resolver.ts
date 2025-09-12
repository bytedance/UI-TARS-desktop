/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentModel, ModelProviderName, BaseModelProviderName } from './types';
import { HIGH_LELVEL_MODEL_PROVIDER_CONFIGS } from './constants';

/**
 * Get the actual provider implementation name
 */
function getActualProvider(providerName: ModelProviderName): BaseModelProviderName {
  const config = HIGH_LELVEL_MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
  return (config?.extends || providerName) as BaseModelProviderName;
}

/**
 * Get default configuration for a provider
 */
function getDefaultConfig(providerName: ModelProviderName) {
  return HIGH_LELVEL_MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
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
  const model = runModel || agentModel?.model || 'gpt-4o';

  let baseURL = agentModel?.baseURL;
  let apiKey = agentModel?.apiKey;
  const displayName = agentModel?.displayName;

  // Apply default configuration from constants if missing
  const defaultConfig = getDefaultConfig(provider);
  if (defaultConfig) {
    baseURL = baseURL || defaultConfig.baseURL;
    apiKey = apiKey || defaultConfig.apiKey;
  }

  return {
    provider,
    model,
    displayName,
    baseURL,
    apiKey,
    baseProvider: getActualProvider(provider),
  };
}
