/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from 'openai/resources';
import type { models } from '@multimodal/llm-client';

export * from './third-party';

/**
 * The actual underlying model provider
 */
export type ActualModelProviderName = keyof typeof models;

/**
 * All Model Providers, including some providers that align with OpenAI compatibility
 */
export type ModelProviderName =
  | ActualModelProviderName
  | 'ollama'
  | 'lm-studio'
  | 'volcengine'
  | 'deepseek';

/**
 * Model provider serving configuration
 */
export interface ModelProviderServingConfig {
  /**
   * Provider's API key
   */
  apiKey?: string;
  /**
   * Provider's base URL
   */
  baseURL?: string;
}

/**
 * Model provider configuration
 */
export interface ModelProvider extends ModelProviderServingConfig {
  /**
   * Model provider name
   */
  name: ModelProviderName;

  /**
   * Provider's supported models
   */
  models: string[];
}

/**
 * Default model selection
 */
export interface ModelDefaultSelection extends ModelProviderServingConfig {
  /**
   * Default provider
   */
  provider?: ModelProviderName;
  /**
   * Default model
   */
  model?: string;
}

/**
 * Configuration options for the LLM provider
 */
export interface ProviderOptions {
  /**
   * Default used model provider and model
   */
  use?: ModelDefaultSelection;
  /**
   * Pre-built Model Providers to be used during runtime
   */
  providers?: ModelProvider[];
}

/**
 * Result of model resolution
 */
export interface ResolvedModel {
  /**
   * The public provider name
   */
  provider: ModelProviderName;
  /**
   * The model name/ID
   */
  model: string;
  /**
   * Base URL for the provider (if specified)
   */
  baseURL?: string;
  /**
   * API key for the provider (if specified)
   */
  apiKey?: string;
  /**
   * The actual implementation provider name
   */
  actualProvider: ActualModelProviderName;
}

/**
 * Provider configuration for specific model providers
 */
export interface ProviderConfig {
  /**
   * Public provider name
   */
  name: ModelProviderName;
  /**
   * The actual implementation provider name
   */
  actual: ActualModelProviderName;
  /**
   * Default base URL (if any)
   */
  baseURL?: string;
  /**
   * Default API key (if any)
   */
  apiKey?: string;
}

/**
 * LLM reasoning options
 */
export interface LLMReasoningOptions {
  /**
   * Whether to enable reasoning
   *
   * @defaultValue {'disabled'}.
   *
   * @compatibility Supported models: 'claude', 'doubao-1.5-thinking'
   */
  type?: 'disabled' | 'enabled';

  /**
   * The `budgetTokens` parameter determines the maximum number of tokens
   * Model is allowed to use for its internal reasoning process.
   *
   * @compatibility Supported models: 'claude'.
   */
  budgetTokens?: number;
}

/**
 * Merged llm request, including reasoning parameters.
 */
export type LLMRequest = ChatCompletionMessageParam & {
  /**
   * Agent reasoning options
   */
  thinking?: LLMReasoningOptions;
};
