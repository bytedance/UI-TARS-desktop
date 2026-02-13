/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';

import { SearchEngineForSettings, VLMProviderV2, Operator } from './types';
import { isKnownModelForProvider } from './modelRegistry';
import { TOOL_FIRST_FEATURE_FLAG_DEFAULTS } from './featureFlags';

const PresetSourceSchema = z.object({
  type: z.enum(['local', 'remote']),
  url: z.string().url().optional(),
  autoUpdate: z.boolean().optional(),
  lastUpdated: z.number().optional(),
});

export const PresetSchema = z
  .object({
    // Local VLM Settings
    vlmProvider: z.nativeEnum(VLMProviderV2).optional(),
    vlmBaseUrl: z.string().url(),
    vlmApiKey: z.string().default(''),
    vlmModelName: z.string().min(1),
    useResponsesApi: z.boolean().optional(),
    codexReasoningEffort: z
      .enum(['auto', 'none', 'low', 'medium', 'high', 'xhigh'])
      .optional(),

    // Chat Settings
    operator: z.nativeEnum(Operator),
    language: z.enum(['zh', 'en']).optional(),
    screenshotScale: z.number().min(0.1).max(1).optional(),
    maxLoopCount: z.number().min(25).max(200).optional(),
    loopIntervalInMs: z.number().min(0).max(3000).optional(),
    searchEngineForBrowser: z.nativeEnum(SearchEngineForSettings).optional(),

    // Report Settings
    reportStorageBaseUrl: z.string().url().optional(),
    utioBaseUrl: z.string().url().optional(),
    presetSource: PresetSourceSchema.optional(),
    ffToolRegistry: z
      .boolean()
      .default(TOOL_FIRST_FEATURE_FLAG_DEFAULTS.ffToolRegistry),
    ffInvokeGate: z
      .boolean()
      .default(TOOL_FIRST_FEATURE_FLAG_DEFAULTS.ffInvokeGate),
    ffToolFirstRouting: z
      .boolean()
      .default(TOOL_FIRST_FEATURE_FLAG_DEFAULTS.ffToolFirstRouting),
    ffConfidenceLayer: z
      .boolean()
      .default(TOOL_FIRST_FEATURE_FLAG_DEFAULTS.ffConfidenceLayer),
    ffLoopGuardrails: z
      .boolean()
      .default(TOOL_FIRST_FEATURE_FLAG_DEFAULTS.ffLoopGuardrails),
  })
  .superRefine((value, ctx) => {
    if (!value.vlmProvider) {
      return;
    }

    if (
      value.vlmProvider !== VLMProviderV2.openai_codex_oauth &&
      !value.vlmApiKey.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API key is required for this provider',
        path: ['vlmApiKey'],
      });
    }

    if (
      value.vlmProvider === VLMProviderV2.openai_codex_oauth &&
      !isKnownModelForProvider(value.vlmProvider, value.vlmModelName)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Model is not supported by Codex OAuth provider',
        path: ['vlmModelName'],
      });
    }
  });

export type PresetSource = z.infer<typeof PresetSourceSchema>;
export type LocalStore = z.infer<typeof PresetSchema>;

export const validatePreset = (data: unknown): LocalStore => {
  return PresetSchema.parse(data);
};
