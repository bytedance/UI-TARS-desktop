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
  private readonly providers: ModelProvider[];
  private readonly defaultSelection: ModelDefaultSelection;

  /**
   * Creates a new ModelResolver
   *
   * @param options - Provider configuration options
   */
  constructor(options: ProviderOptions = {}) {
    this.providers = options.providers || [];
    this.defaultSelection = this.buildDefaultSelection(options);
  }

  /**
   * Build the default model selection from options
   */
  private buildDefaultSelection(options: ProviderOptions): ModelDefaultSelection {
    // Explicit selection takes priority
    if (options.id || options.provider || options.apiKey || options.baseURL) {
      return {
        id: options.id,
        provider: options.provider,
        apiKey: options.apiKey,
        baseURL: options.baseURL,
      };
    }

    // Auto-infer from first provider if available
    const firstProvider = this.providers[0];
    if (firstProvider?.models?.length > 0) {
      return {
        provider: firstProvider.name,
        id: firstProvider.models[0],
        baseURL: firstProvider.baseURL,
        apiKey: firstProvider.apiKey,
      };
    }

    return {};
  }

  /**
   * Find a configured provider by name
   */
  private findConfiguredProvider(name: ModelProviderName): ModelProvider | undefined {
    return this.providers.find((provider) => provider.name === name);
  }

  /**
   * Find provider that supports the specified model
   */
  private findProviderByModel(modelName: string): ModelProvider | undefined {
    return this.providers.find((provider) => provider.models.includes(modelName));
  }

  /**
   * Get the actual provider implementation name
   */
  private getActualProvider(providerName: ModelProviderName): ActualModelProviderName {
    const config = MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
    return (config?.actual || providerName) as ActualModelProviderName;
  }

  /**
   * Get default configuration for a provider
   */
  private getDefaultConfig(providerName: ModelProviderName) {
    return MODEL_PROVIDER_CONFIGS.find((c) => c.name === providerName);
  }

  /**
   * Resolves the model configuration based on run options and defaults
   *
   * @param runModel - Model specified in run options (optional)
   * @param runProvider - Provider specified in run options (optional)
   * @returns Resolved model configuration
   */
  resolve(runModel?: string, runProvider?: ModelProviderName): ResolvedModel {
    // Start with runtime parameters
    let provider = runProvider;
    let model = runModel;
    let baseURL: string | undefined;
    let apiKey: string | undefined;

    // If no provider specified but we have a model, try to infer from configured providers
    if (!provider && model) {
      const inferredProvider = this.findProviderByModel(model);
      if (inferredProvider) {
        provider = inferredProvider.name;
      }
    }

    // Fall back to default selection if still no provider
    if (!provider) {
      provider = this.defaultSelection.provider || 'openai';
    }

    // Fall back to default model if none specified
    if (!model) {
      model = this.defaultSelection.id || 'gpt-4o';
    }

    // Try to get configuration from configured provider first
    const configuredProvider = this.findConfiguredProvider(provider);
    if (configuredProvider) {
      baseURL = configuredProvider.baseURL;
      apiKey = configuredProvider.apiKey;
    }

    // Fall back to default selection configuration
    if (!baseURL) {
      baseURL = this.defaultSelection.baseURL;
    }
    if (!apiKey) {
      apiKey = this.defaultSelection.apiKey;
    }

    // Apply default configuration from constants if still missing
    const defaultConfig = this.getDefaultConfig(provider);
    if (defaultConfig) {
      baseURL = baseURL || defaultConfig.baseURL;
      apiKey = apiKey || defaultConfig.apiKey;
    }

    return {
      provider,
      id: model,
      baseURL,
      apiKey,
      actualProvider: this.getActualProvider(provider),
    };
  }

  /**
   * Gets all configured model providers
   */
  getAllProviders(): ModelProvider[] {
    return [...this.providers];
  }

  /**
   * Gets the default model selection
   */
  getDefaultSelection(): ModelDefaultSelection {
    return { ...this.defaultSelection };
  }
}
