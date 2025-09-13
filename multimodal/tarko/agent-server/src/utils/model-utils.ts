/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentModel, AgentAppConfig } from '../types';

/**
 * Get available models by merging AgentOptions.model with server.models
 * @param appConfig The agent application configuration
 * @returns Array of available models
 */
export function getAvailableModels(appConfig: AgentAppConfig): AgentModel[] {
  const models: AgentModel[] = [];
  if (appConfig.model) {
    models.push(appConfig.model);
  }
  if (appConfig.server?.models) {
    models.push(...appConfig.server.models);
  }
  return models;
}

/**
 * Get the default model
 * @param appConfig The agent application configuration
 * @returns Default model (AgentOptions.model or first server.models)
 */
export function getDefaultModel(appConfig: AgentAppConfig): AgentModel | undefined {
  // Prefer AgentOptions.model if it exists
  if (appConfig.model) {
    return appConfig.model;
  }

  // Fall back to first server.models
  if (appConfig.server?.models && appConfig.server.models.length > 0) {
    return appConfig.server.models[0];
  }

  return undefined;
}

/**
 * Check if a model configuration is valid
 * @param appConfig The agent application configuration
 * @param provider Model provider
 * @param modelId Model ID
 * @returns True if model is valid
 */
export function isModelConfigValid(
  appConfig: AgentAppConfig,
  provider: string,
  modelId: string,
): boolean {
  const availableModels = getAvailableModels(appConfig);
  return availableModels.some((model) => model.provider === provider && model.id === modelId);
}
