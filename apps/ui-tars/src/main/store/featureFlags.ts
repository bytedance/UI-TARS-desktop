/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const TOOL_FIRST_FEATURE_FLAG_DEFAULTS = Object.freeze({
  ffToolRegistry: false,
  ffInvokeGate: false,
  ffToolFirstRouting: false,
  ffConfidenceLayer: false,
  ffLoopGuardrails: false,
});

export type ToolFirstFeatureFlags = {
  ffToolRegistry: boolean;
  ffInvokeGate: boolean;
  ffToolFirstRouting: boolean;
  ffConfidenceLayer?: boolean;
  ffLoopGuardrails?: boolean;
};

export const resolveToolFirstFeatureFlags = (
  flags?: Partial<ToolFirstFeatureFlags>,
): ToolFirstFeatureFlags => {
  return {
    ...TOOL_FIRST_FEATURE_FLAG_DEFAULTS,
    ...flags,
  };
};
