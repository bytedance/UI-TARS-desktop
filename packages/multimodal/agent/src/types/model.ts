/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { models } from 'token.js';

// #region Model
/**
 * Model config
 */
export interface Model {
  /**
   * Model id that actually used in LLM request
   */
  id: string;
  /**
   * Model display name
   */
  label: string;
}

/**
 * Model provider name
 *
 * @type {"openai" | "ai21" | "anthropic" | "gemini" | "cohere" | "bedrock" | "mistral" | "groq" | "perplexity" | "openrouter" | "openai-compatible"}
 */
export type ModelProviderName = keyof typeof models;

/**
 * Model provider config
 */
export interface ModelProvider {
  name: ModelProviderName;
  apiKey: string;
  baseURL: string;
  models: Model[];
}

/**
 * Model setting
 */
export interface ModelSetting {
  providers: ModelProvider[];
}
