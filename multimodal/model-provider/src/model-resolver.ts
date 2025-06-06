/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ModelProvider,
  ModelProviderName,
  ModelDefaultSelection,
  ProviderOptions,
  ResolvedModel,
  ActualModelProviderName,
} from './types';
import { MODEL_PROVIDER_CONFIGS } from './constants';

/**
 * ModelResolver - Resolves model and provider configurations
 *
 * This class handles the resolution of model providers and models
 * based on provided configurations and defaults.
 */
export class ModelResolver {
  private options: ProviderOptions;
  private defaultSelection: ModelDefaultSelection;
  private providers: ModelProvider[] | undefined;

  /**
   * Creates a new ModelResolver
   *
   * @param options - Provider configuration options
   */
  constructor(options: ProviderOptions = {}) {
    this.options = options;
    this.providers = options.providers;
    this.defaultSelection = this.determineDefaultModelSelection();
  }

  /**
   * Determines the default model selection based on configuration
   */
  private determineDefaultModelSelection(): ModelDefaultSelection {
    const { providers, use } = this.options;

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
        baseURL: providers[0].baseURL,
        apiKey: providers[0].apiKey,
      };
    }

    // Return empty object if we can't determine defaults
    return {};
  }

  /**
   * Finds a provider in the configured providers list
   */
  private findProvider(providerName: ModelProviderName): ModelProvider | undefined {
    return this.providers?.find((provider) => provider.name === providerName);
  }

  /**
   * Finds a provider that supports the specified model
   */
  private findProviderForModel(modelName: string): ModelProvider | undefined {
    return this.providers?.find((provider) => provider.models.some((model) => model === modelName));
  }

  /**
   * Gets the actual provider name for a model provider
   */
  private getActualProviderName(providerName: ModelProviderName): ActualModelProviderName {
    const defaultConfig = MODEL_PROVIDER_CONFIGS.find((config) => config.name === providerName);
    return (defaultConfig?.actual || providerName) as ActualModelProviderName;
  }

  /**
   * Resolves the model configuration based on run options and defaults
   *
   * @param runModel - Model specified in run options (optional)
   * @param runProvider - Provider specified in run options (optional)
   * @returns Resolved model configuration
   */
  resolve(runModel?: string, runProvider?: ModelProviderName): ResolvedModel {
    // Start with values from run options
    let model = runModel;
    let provider = runProvider;
    let baseURL: string | undefined;
    let apiKey: string | undefined;

    // If no model specified in run options, use default
    if (!model) {
      model = this.defaultSelection.model;
      provider = this.defaultSelection.provider;
      baseURL = this.defaultSelection.baseURL;
      apiKey = this.defaultSelection.apiKey;
    }

    // If provider is still missing but we have a model, try to infer provider from model
    if (!provider && model) {
      const inferredProvider = this.findProviderForModel(model);

      if (inferredProvider) {
        provider = inferredProvider.name;
        baseURL = inferredProvider.baseURL;
        apiKey = inferredProvider.apiKey;
      } else {
        // Default to OpenAI if we can't infer
        provider = 'openai';
      }
    }

    // If neither model nor provider specified, use OpenAI defaults
    if (!provider) {
      provider = 'openai';
      model = model || 'gpt-4o';
    }

    // If still no model, throw error
    if (!model) {
      throw new Error(
        `[Config] Missing model configuration. Please specify a model when resolving or in the provider options.`,
      );
    }

    // If found a provider in the configured providers, use its baseURL and apiKey
    if (this.providers) {
      const configuredProvider = this.findProvider(provider);
      if (configuredProvider) {
        baseURL = baseURL || configuredProvider.baseURL;
        apiKey = apiKey || configuredProvider.apiKey;
      }
    }

    // Get actual provider name for any extended providers
    const actualProvider = this.getActualProviderName(provider);

    // Apply default provider configuration if available
    const defaultConfig = MODEL_PROVIDER_CONFIGS.find((config) => config.name === provider);

    if (defaultConfig) {
      baseURL = baseURL || defaultConfig.baseURL;
      apiKey = apiKey || defaultConfig.apiKey;
    }

    return {
      provider,
      model,
      baseURL,
      apiKey,
      actualProvider,
    };
  }

  /**
   * Gets all configured model providers
   */
  getAllProviders(): ModelProvider[] {
    return this.providers || [];
  }

  /**
   * Gets the default model selection
   */
  getDefaultSelection(): ModelDefaultSelection {
    return this.defaultSelection;
  }
}
