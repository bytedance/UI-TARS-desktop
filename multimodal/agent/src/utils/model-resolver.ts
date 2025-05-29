/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentOptions,
  ModelDefaultSelection,
  ModelProvider,
  ModelProviderName,
  ActualModelProviderName,
} from '@multimodal/agent-interface';
import { getLogger } from './logger';

const logger = getLogger('ModelResolver');

/**
 * Model provider defaults configuration
 */
interface ModelProviderDefaultConfig {
  name: ModelProviderName; // Public provider name
  actual: ActualModelProviderName; // Internal implementation name
  baseURL?: string;
  apiKey?: string;
}

/**
 * Default configurations for extended model providers
 */
const MODEL_PROVIDER_DEFAULT_CONFIGS: ModelProviderDefaultConfig[] = [
  {
    name: 'ollama',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
  },
  {
    name: 'lm-studio',
    actual: 'openai',
    baseURL: 'http://127.0.0.1:1234/v1',
    apiKey: 'lm-studio',
  },
  {
    name: 'volcengine',
    actual: 'openai',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  {
    name: 'deepseek',
    actual: 'openai',
    baseURL: 'https://api.deepseek.com/v1',
  },
];

/**
 * Result of model resolution
 */
export interface ResolvedModel {
  provider: ModelProviderName;
  model: string;
  baseURL?: string;
  apiKey?: string;
  actualProvider: ActualModelProviderName;
}

/**
 * A service class for resolving model configurations
 */
export class ModelResolver {
  private agentOptions: AgentOptions;
  private defaultSelection: ModelDefaultSelection;
  private providers: ModelProvider[] | undefined;

  /**
   * Creates a new ModelResolver
   * @param agentOptions - The agent options containing model configuration
   */
  constructor(agentOptions: AgentOptions) {
    this.agentOptions = agentOptions;
    this.providers = agentOptions.model?.providers;
    this.defaultSelection = this.determineDefaultModelSelection();
  }

  /**
   * Determines the default model selection based on agent configuration
   */
  private determineDefaultModelSelection(): ModelDefaultSelection {
    const { providers, use } = this.agentOptions.model ?? {};

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
   * Normalizes a model provider by applying default configurations if needed
   */
  private normalizeModelProvider(provider: ModelProvider): ModelProvider {
    const defaultConfig = MODEL_PROVIDER_DEFAULT_CONFIGS.find(
      (config) => config.name === provider.name,
    );

    if (defaultConfig) {
      return {
        baseURL: defaultConfig.baseURL,
        apiKey: defaultConfig.apiKey,
        ...provider,
        name: defaultConfig.actual,
      };
    }

    return provider;
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
    const defaultConfig = MODEL_PROVIDER_DEFAULT_CONFIGS.find(
      (config) => config.name === providerName,
    );
    return defaultConfig?.actual || (providerName as ActualModelProviderName);
  }

  /**
   * Resolves the model configuration based on run options and defaults
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

    logger.debug(`Initial resolution - Provider: ${provider}, Model: ${model}`);

    // If provider is still missing but we have a model, try to infer provider from model
    if (!provider && model) {
      const inferredProvider = this.findProviderForModel(model);

      if (inferredProvider) {
        provider = inferredProvider.name;
        baseURL = inferredProvider.baseURL;
        apiKey = inferredProvider.apiKey;
        logger.debug(`Inferred provider: ${provider} for model: ${model}`);
      } else {
        // Default to OpenAI if we can't infer
        provider = 'openai';
        logger.warn(`Could not infer provider for model: ${model}, defaulting to 'openai'`);
      }
    }

    // If neither model nor provider specified, use OpenAI defaults
    if (!provider) {
      provider = 'openai';
      model = model || 'gpt-4o';
      logger.warn(
        `Missing model provider configuration. Using default provider "${provider}" and model "${model}"`,
      );
    }

    // If still no model, throw error
    if (!model) {
      throw new Error(
        `[Config] Missing model configuration. Please specify when calling "Agent.run" or in Agent initialization.`,
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
    const defaultConfig = MODEL_PROVIDER_DEFAULT_CONFIGS.find((config) => config.name === provider);

    if (defaultConfig) {
      baseURL = baseURL || defaultConfig.baseURL;
      apiKey = apiKey || defaultConfig.apiKey;
    }

    logger.info(`Resolved model configuration:
      - Provider: ${provider}
      - Model: ${model}
      - Base URL: ${baseURL || 'default'}
      - API Key: ${apiKey ? '******' : 'default'}
      - Actual Provider: ${actualProvider}
    `);

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
    return (this.providers || []).map((provider) => this.normalizeModelProvider(provider));
  }

  /**
   * Gets the default model selection
   */
  getDefaultSelection(): ModelDefaultSelection {
    return this.defaultSelection;
  }
}
