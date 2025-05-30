/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { models } from '@multimodal/llm-client';

/**
 * Modle feature flags, note that for now wo DO NOT implement it fully.
 */
export enum ModelFeatureFlag {
  ChatCompletion = 0,
  ChatCompletionStreaming = 1,
  ToolCalls = 2,
  JSON = 3,
  Images = 4,
  Thinking = 5,
}

/**
 * Model config
 *
 * FIXME: [Contribution welcome] support detailed model config.
 */
// export interface Model {
//   /**
//    * Model id that actually used in LLM request
//    */
//   id: string;
//   /**
//    * Model display name
//    */
//   label?: string;
//   /**
//    * Model feature flags.
//    */
//   features?: ModelFeatureFlag[];
// }

/**
 * The actual underlying model provider
 */
export type ActualModelProviderName = keyof typeof models;

/**
 * All Model Providers, including some formal Model Providers,
 * such as Ollama, are essentially aligned with OpenAI Compatibility.
 */
export type ModelProviderName =
  | ActualModelProviderName
  | 'ollama'
  | 'lm-studio'
  | 'volcengine'
  | 'deepseek';

/**
 * Model provider configuration related to LLM Serving.
 */
export interface ModelProviderServingConfig {
  /**
   * Provider's api key
   */
  apiKey?: string;
  /**
   * Provider's base url
   */
  baseURL?: string;
}

/**
 * Model provider config
 */
export interface ModelProvider extends ModelProviderServingConfig {
  /**
   * Model provider name.
   */
  name: ModelProviderName;

  /**
   * Provider's supported models.
   */
  models: string[];
}

/**
 * Model default selection
 */
export interface ModelDefaultSelection extends ModelProviderServingConfig {
  /**
   * Default provider.
   */
  provider?: ModelProviderName;
  /**
   * Default model.
   */
  model?: string;
}

/**
 * Model setting
 */
export interface ModelSetting {
  /**
   * Default used model provider and model, if "Agent.run" does not specify a model,
   * this id will be used by default
   */
  use?: ModelDefaultSelection;
  /**
   * Pre-built Model Providers to be used during actual runtime.
   */
  providers?: ModelProvider[];
}
