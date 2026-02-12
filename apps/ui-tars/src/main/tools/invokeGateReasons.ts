/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export const INVOKE_GATE_DENY_REASONS = [
  'invoke_gate_disabled',
  'loop_budget_exhausted',
  'action_type_missing',
  'action_type_unsupported',
  'start_box_required',
  'auth_state_invalid',
] as const;

export type InvokeGateDenyReason = (typeof INVOKE_GATE_DENY_REASONS)[number];

export type InvokeGateDenyReasonMetadata = {
  severity: 'info' | 'warning' | 'error';
  retryable: boolean;
  message: string;
  guidance: string;
};

export const INVOKE_GATE_DENY_REASON_CATALOG: Record<
  InvokeGateDenyReason,
  InvokeGateDenyReasonMetadata
> = {
  invoke_gate_disabled: {
    severity: 'info',
    retryable: true,
    message: 'Invoke gate is disabled by feature flag.',
    guidance: 'Enable ffInvokeGate to enforce gate allow/deny policy.',
  },
  loop_budget_exhausted: {
    severity: 'error',
    retryable: false,
    message: 'Loop budget has been exhausted for this session.',
    guidance:
      'Increase maxLoopCount or reduce repeated loops before next attempt.',
  },
  action_type_missing: {
    severity: 'error',
    retryable: true,
    message: 'Action type is missing in parsed prediction.',
    guidance: 'Ensure parser emits a non-empty action_type field.',
  },
  action_type_unsupported: {
    severity: 'error',
    retryable: true,
    message: 'Action type is not in invoke gate allowlist.',
    guidance: 'Add modeled action to allowlist or change planner output.',
  },
  start_box_required: {
    severity: 'warning',
    retryable: true,
    message: 'Action requires start_box coordinates but none were provided.',
    guidance:
      'Provide start_box for pointer-target actions (click/drag/hover/move).',
  },
  auth_state_invalid: {
    severity: 'error',
    retryable: true,
    message: 'Auth state is invalid for this mutating action.',
    guidance: 'Re-authenticate provider or switch to non-mutating action path.',
  },
};
