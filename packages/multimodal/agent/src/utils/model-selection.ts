/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentOptions, ModelDefaultSelection, ModelProviderName } from '../types';
import { rootLogger } from './logger';

/**
 * Determines the default model selection based on agent configuration
 *
 * @param options Agent options that may contain model configuration
 * @returns ModelDefaultSelection with provider and model names
 */
export function determineDefaultModelSelection(options: AgentOptions): ModelDefaultSelection {
  const { providers, use } = options.model ?? {};

  // Use explicit selection if provided
  if (use) {
    return use;
  }

  // Try to infer from provided providers
  if (
    Array.isArray(providers) &&
    providers.length >= 1 &&
    Array.isArray(providers[0].models) &&
    providers[0].models.length >= 1
  ) {
    return {
      provider: providers[0].name,
      model: providers[0].models[0],
    };
  }

  // Return empty object if we can't determine defaults
  return {};
}

/**
 * Resolves which model and provider to use based on run options and defaults
 *
 * @param runModel Model specified in run options (optional)
 * @param runProvider Provider specified in run options (optional)
 * @param defaultSelection Default model selection from agent config
 * @param providers Available model providers configuration
 * @returns Object containing resolved provider and model names
 */
export function resolveModelAndProvider(
  runModel: string | undefined,
  runProvider: string | undefined,
  defaultSelection: ModelDefaultSelection,
  providers?: { name: string; models: string[] }[],
): { provider: ModelProviderName; model: string } {
  // Start with values from run options
  let model = runModel;
  let provider = runProvider;

  // If no model specified in run options, use default
  if (!model) {
    model = defaultSelection.model;
    provider = defaultSelection.provider;
  }

  rootLogger.info('Using model:', model);
  rootLogger.info('Using provider:', provider);

  // If provider is still missing, try to infer from model name
  if (!provider) {
    if (model) {
      // Try to find a provider that includes this model
      const inferredProvider = providers?.find((p) => p.models.some((m) => m === model));

      if (inferredProvider) {
        provider = inferredProvider.name;
        rootLogger.info('Inferred provider:', provider);
      } else {
        // Default to OpenAI if we can't infer
        provider = 'openai';
      }
    } else {
      // If neither model nor provider specified, use OpenAI defaults
      provider = 'openai';
      model = 'gpt-4o';
    }

    rootLogger.warn(
      `[Config] Missing model provider configuration. ` +
        `Please specify when calling "Agent.run" or in Agent initialization. ` +
        `Using default provider "${provider}"`,
    );
  }

  if (!model) {
    throw new Error(
      `[Config] Missing model configuration. ` +
        `Please specify when calling "Agent.run" or in Agent initialization.`,
    );
  }

  return { provider: provider as ModelProviderName, model };
}
