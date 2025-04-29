/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';

import { VLMProviderV2 } from './types';

const PresetSourceSchema = z.object({
  type: z.enum(['local', 'remote']),
  url: z.string().url().optional(),
  autoUpdate: z.boolean().optional(),
  lastUpdated: z.number().optional(),
});

export const PresetSchema = z.object({
  // Fields that can be imported from preset or set in UI
  vlmProvider: z.nativeEnum(VLMProviderV2).optional(),
  vlmBaseUrl: z.string().url().optional(),
  vlmApiKey: z.string().min(1).optional(),
  vlmModelName: z.string().min(1).optional(),

  // Optional fields
  language: z.enum(['zh', 'en']).optional(),
  screenshotScale: z.number().min(0.1).max(1).optional(),
  maxLoopCount: z.number().min(25).max(200).optional(),
  loopIntervalInMs: z.number().min(0).max(3000).optional(),
  operator: z.enum(['nutjs', 'browser']).optional(),
  reportStorageBaseUrl: z.string().url().optional(),
  utioBaseUrl: z.string().url().optional(),
  presetSource: PresetSourceSchema.optional(),
});

export type PresetSource = z.infer<typeof PresetSourceSchema>;
export type LocalStore = z.infer<typeof PresetSchema>;

export const validatePreset = (data: unknown): LocalStore => {
  return PresetSchema.parse(data);
};

// Merge existing settings with imported settings, ensuring required fields exist
export const mergeWithExistingSettings = (imported: Partial<LocalStore>, existing: LocalStore): LocalStore => {
  // Merge settings, prioritizing imported values but keeping existing values as fallback
  return {
    ...existing,
    ...imported,
    // Ensure these three key fields have values from at least one source
    vlmBaseUrl: imported.vlmBaseUrl || existing.vlmBaseUrl,
    vlmApiKey: imported.vlmApiKey || existing.vlmApiKey,
    vlmModelName: imported.vlmModelName || existing.vlmModelName,
  };
};
