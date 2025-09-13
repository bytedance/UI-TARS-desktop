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

/**
 * Transform available models into grouped format for API response
 * @param appConfig The agent application configuration
 * @returns Models grouped by provider with deduplication
 */
export function getModelsGroupedByProvider(appConfig: AgentAppConfig) {
  const availableModels = getAvailableModels(appConfig);

  // Group models by provider while preserving full model information
  const modelsByProvider = availableModels.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      // Deduplication by model ID
      const existingModel = acc[model.provider].find((m) => m.id === model.id);
      if (!existingModel) {
        acc[model.provider].push({
          id: model.id,
          displayName: model.displayName,
        });
      }
      return acc;
    },
    {} as Record<string, Array<{ id: string; displayName?: string }>>,
  );

  return Object.entries(modelsByProvider).map(([provider, modelList]) => ({
    provider,
    models: modelList,
  }));
}
