/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { Operator, VLMProviderV2 } from './types';
import { PresetSchema } from './validate';

describe('PresetSchema tool-first flags', () => {
  const basePreset = {
    vlmProvider: VLMProviderV2.ui_tars_1_5,
    vlmBaseUrl: 'https://example.com/v1',
    vlmApiKey: 'test-key',
    vlmModelName: 'UI-TARS-1.5',
    operator: Operator.LocalComputer,
  };

  it('defaults all tool-first flags to false', () => {
    const parsed = PresetSchema.parse(basePreset);

    expect(parsed.ffToolRegistry).toBe(false);
    expect(parsed.ffInvokeGate).toBe(false);
    expect(parsed.ffToolFirstRouting).toBe(false);
  });

  it('accepts explicit tool-first flag values', () => {
    const parsed = PresetSchema.parse({
      ...basePreset,
      ffToolRegistry: true,
      ffInvokeGate: true,
      ffToolFirstRouting: true,
    });

    expect(parsed.ffToolRegistry).toBe(true);
    expect(parsed.ffInvokeGate).toBe(true);
    expect(parsed.ffToolFirstRouting).toBe(true);
  });
});
