/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { resolveToolFirstTargetWithConfidence } from './toolFirstTarget';

describe('resolveToolFirstTargetWithConfidence', () => {
  it('returns max confidence for exact explicit identity field match', () => {
    const result = resolveToolFirstTargetWithConfidence({
      target_window: 'settings',
    });

    expect(result).toEqual({
      target: 'settings',
      confidence: 1,
      sourceField: 'target_window',
      ambiguous: false,
    });
  });

  it('returns lower confidence for implicit content match', () => {
    const result = resolveToolFirstTargetWithConfidence({
      content: 'please open cursor editor',
    });

    expect(result?.target).toBe('cursor');
    expect(result?.confidence).toBeLessThan(0.75);
    expect(result?.ambiguous).toBe(false);
  });

  it('marks ambiguous multi-target strings with low confidence', () => {
    const result = resolveToolFirstTargetWithConfidence({
      content: 'open cursor or settings',
    });

    expect(result?.target).toBe('cursor');
    expect(result?.ambiguous).toBe(true);
    expect(result?.confidence).toBeLessThan(0.75);
  });
});
