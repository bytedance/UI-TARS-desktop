/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentModel, AgentAppConfig } from '../types';

export function getAvailableModels(appConfig: AgentAppConfig): AgentModel[] {
  return [
    ...(appConfig.model ? [appConfig.model] : []),
    ...(appConfig.server?.models || []),
  ];
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
    (model) => model.provider === provider && model.id === modelId
  );
}
