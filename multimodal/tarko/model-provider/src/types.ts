/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from 'openai/resources';
import type { ChatCompletionCreateParamsBase } from 'openai/resources/chat/completions';
import type { models } from '@tarko/llm-client';

export * from './third-party';

/**
 * The base underlying model provider
 */
export type BaseModelProviderName = keyof typeof models;

/**
 * All Model Providers, including some providers that align with OpenAI compatibility
 */
export type ModelProviderName =
  | BaseModelProviderName
  | 'ollama'
  | 'lm-studio'
  | 'volcengine'
  | 'deepseek';

/**
 * Basic Model configuration
 *
 * Shared between Agent and LLM.
 */
export interface Model {
  /**
   * Provider's API key
   */
  apiKey?: string;
  /**
   * Provider's base URL
   */
  baseURL?: string;
  /**
   * Additional headers to include in requests
   */
  headers?: Record<string, string>;
}

/**
 * Model configuration used by the Agent.
 */
export interface AgentModel extends Model {
  /**
   * Model identifier
   */
  id: string;
  /**
   * High-level Provider name
   */
  provider: ModelProviderName;
  /**
   * Display name for the model
   */
  displayName?: string;
  /**
   * Base provider name
   */
  baseProvider?: BaseModelProviderName;
  /**
   * Experimental parameters passed directly through request body
   * @warning Use with caution - these parameters bypass validation
   */
  params?: Record<string, any>;
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
   * The base implementation provider name
   */
  extends: BaseModelProviderName;
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
 * Extends OpenAI's ChatCompletionCreateParamsBase for full type safety
 */
export interface LLMRequest extends ChatCompletionCreateParamsBase {
  /**
   * Agent reasoning options
   */
  thinking?: LLMReasoningOptions;
}
