/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentModel, AgentAppConfig } from '../types';

export function getAvailableModels(appConfig: AgentAppConfig): AgentModel[] {
  const allModels = [
    ...(appConfig.model ? [appConfig.model] : []),
    ...(appConfig.server?.models || []),
  ];

  // Deduplicate by model.id, keeping the first occurrence
  const uniqueModels = allModels.filter(
    (model, index, arr) => arr.findIndex((m) => m.id === model.id) === index,
  );

  return uniqueModels;
}

export function getDefaultModel(appConfig: AgentAppConfig): AgentModel | undefined {
  return appConfig.model || appConfig.server?.models?.[0];
}

export function isModelConfigValid(
  appConfig: AgentAppConfig,
  provider: string,
  modelId: string,
): boolean {
  return getAvailableModels(appConfig).some(
    (model) => model.provider === provider && model.id === modelId,
  );
}
