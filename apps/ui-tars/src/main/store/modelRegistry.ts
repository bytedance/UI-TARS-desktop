/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { VLMProviderV2 } from './types';

type VLMProviderRegistryItem = {
  models: readonly string[];
  defaultModel: string;
  defaultBaseUrl?: string;
  supportsResponsesApi: boolean;
  requiresApiKey: boolean;
  requiresOAuth: boolean;
};

export type CodexReasoningEffort = 'low' | 'medium' | 'high';

export const CODEX_ORIGINATOR = 'codex_cli_rs';
export const CODEX_OPENAI_BETA = 'responses=experimental';

export const CODEX_OAUTH_SUPPORTED_MODELS = [
  'gpt-5.1-codex',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
  'gpt-5.2',
  'gpt-5.2-codex',
  'gpt-5.3',
  'gpt-5.3-codex',
] as const;

export const VLM_PROVIDER_REGISTRY: Record<
  VLMProviderV2,
  VLMProviderRegistryItem
> = {
  [VLMProviderV2.ui_tars_1_0]: {
    models: ['UI-TARS-1.0'],
    defaultModel: 'UI-TARS-1.0',
    supportsResponsesApi: false,
    requiresApiKey: true,
    requiresOAuth: false,
  },
  [VLMProviderV2.ui_tars_1_5]: {
    models: ['UI-TARS-1.5'],
    defaultModel: 'UI-TARS-1.5',
    supportsResponsesApi: false,
    requiresApiKey: true,
    requiresOAuth: false,
  },
  [VLMProviderV2.doubao_1_5]: {
    models: ['doubao-1-5-ui-tars-250428'],
    defaultModel: 'doubao-1-5-ui-tars-250428',
    supportsResponsesApi: false,
    requiresApiKey: true,
    requiresOAuth: false,
  },
  [VLMProviderV2.doubao_1_5_vl]: {
    models: ['doubao-1-5-thinking-vision-pro-250428'],
    defaultModel: 'doubao-1-5-thinking-vision-pro-250428',
    supportsResponsesApi: true,
    requiresApiKey: true,
    requiresOAuth: false,
  },
  [VLMProviderV2.openai_codex_oauth]: {
    models: CODEX_OAUTH_SUPPORTED_MODELS,
    defaultModel: 'gpt-5.3-codex',
    defaultBaseUrl: 'https://chatgpt.com/backend-api/codex',
    supportsResponsesApi: true,
    requiresApiKey: false,
    requiresOAuth: true,
  },
};

export const getProviderModels = (
  provider?: VLMProviderV2,
): readonly string[] => {
  if (!provider) {
    return [];
  }

  return VLM_PROVIDER_REGISTRY[provider]?.models ?? [];
};

export const isKnownVLMProvider = (
  provider: string,
): provider is VLMProviderV2 => {
  return Object.hasOwn(VLM_PROVIDER_REGISTRY, provider);
};

export const getDefaultModelNameForProvider = (
  provider?: VLMProviderV2,
): string => {
  if (!provider) {
    return '';
  }

  return VLM_PROVIDER_REGISTRY[provider]?.defaultModel ?? '';
};

export const isKnownModelForProvider = (
  provider: VLMProviderV2,
  modelName: string,
): boolean => {
  return getProviderModels(provider).includes(modelName);
};

export const isCodexOAuthModelName = (modelName: string): boolean => {
  return CODEX_OAUTH_SUPPORTED_MODELS.includes(
    modelName as (typeof CODEX_OAUTH_SUPPORTED_MODELS)[number],
  );
};

export const getCodexReasoningEffortByModel = (
  modelName: string,
): CodexReasoningEffort => {
  const normalized = modelName.toLowerCase();

  if (
    normalized.includes('gpt-5.3') ||
    normalized.includes('gpt-5.2') ||
    normalized.includes('codex-max')
  ) {
    return 'high';
  }

  if (normalized.includes('codex-mini')) {
    return 'medium';
  }

  return 'medium';
};
