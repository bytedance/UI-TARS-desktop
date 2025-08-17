/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from 'openai/resources';
import type { models } from '@tarko/llm-client';

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
 * Default model selection configuration
 */
export interface ModelDefaultSelection extends ModelProviderServingConfig {
  /**
   * Default provider name
   */
  provider?: ModelProviderName;
  /**
   * Default model identifier
   */
  id?: string;
  /**
   * Display name for the default model
   */
  displayName?: string;
}

/**
 * Model configuration with optional display name
 */
export interface ModelConfig {
  /**
   * Model identifier
   */
  id: string;
  /**
   * Display name for the model
   */
  displayName?: string;
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
   * Provider's supported model identifiers (can be strings or objects with displayName)
   */
  models: (string | ModelConfig)[];
}

/**
 * Configuration options for the model provider
 */
export interface ProviderOptions extends ModelDefaultSelection {
  /**
   * Pre-configured model providers for runtime use
   */
  providers?: ModelProvider[];
}

/**
 * Result of model resolution containing all necessary configuration
 */
export interface ResolvedModel {
  /**
   * The public provider name
   */
  provider: ModelProviderName;
  /**
   * The model identifier for LLM requests
   */
  id: string;
  /**
   * Display name for the model (fallback to id if not provided)
   */
  displayName?: string;
  /**
   * Base URL for the provider API
   */
  baseURL?: string;
  /**
   * API key for authentication
   */
  apiKey?: string;
  /**
   * The actual implementation provider name
   */
  actualProvider: ActualModelProviderName;
}

/**
 * Provider configuration for extended providers
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
   * Default base URL
   */
  baseURL?: string;
  /**
   * Default API key
   */
  apiKey?: string;
}

/**
 * LLM reasoning configuration options
 */
export interface LLMReasoningOptions {
  /**
   * Whether to enable reasoning
   *
   * @defaultValue 'disabled'
   * @compatibility Supported models: 'claude', 'doubao-1.5-thinking'
   */
  type?: 'disabled' | 'enabled';

  /**
   * Maximum tokens for internal reasoning process
   *
   * @compatibility Supported models: 'claude'
   */
  budgetTokens?: number;
}

/**
 * Extended LLM request with reasoning parameters
 */
export type LLMRequest = ChatCompletionMessageParam & {
  /**
   * Agent reasoning options
   */
  thinking?: LLMReasoningOptions;
};
