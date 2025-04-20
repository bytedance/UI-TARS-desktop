/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { VLMProviderV2 } from './types';

describe('VLMProviderV2', () => {
  it('should have correct values for each provider', () => {
    const cases = [
      [VLMProviderV2.ui_tars_1_0, 'Hugging Face for UI-TARS-1.0'],
      [VLMProviderV2.ui_tars_1_5, 'Hugging Face for UI-TARS-1.5'],
      [VLMProviderV2.doubao_1_5, 'VolcEngine Ark for Doubao-1.5-UI-TARS'],
    ];

    cases.forEach(([provider, expected]) => {
      expect(provider).toBe(expected);
    });
  });
  it('should have correct value for Doubao provider', () => {
    expect(VLMProviderV2.doubao_1_5).toBe(
      'VolcEngine Ark for Doubao-1.5-UI-TARS',
    );
  });

  it('should contain exactly three providers', () => {
    const providerCount = Object.keys(VLMProviderV2).length;
    expect(providerCount).toBe(3);
  });
});
