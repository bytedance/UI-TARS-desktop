/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import {
  resolveToolFirstFeatureFlags,
  TOOL_FIRST_FEATURE_FLAG_DEFAULTS,
} from './featureFlags';

describe('tool-first feature flags', () => {
  it('resolves to defaults when no values provided', () => {
    expect(resolveToolFirstFeatureFlags()).toEqual(
      TOOL_FIRST_FEATURE_FLAG_DEFAULTS,
    );
  });

  it('keeps explicit overrides while preserving unspecified defaults', () => {
    expect(
      resolveToolFirstFeatureFlags({
        ffToolRegistry: true,
        ffInvokeGate: true,
      }),
    ).toEqual({
      ffToolRegistry: true,
      ffInvokeGate: true,
      ffToolFirstRouting: false,
      ffConfidenceLayer: false,
    });
  });
});
