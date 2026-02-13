/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { randomUUID } from 'crypto';

import { type PredictionParsed } from '@ui-tars/shared/types';
import { z } from 'zod';

import type { ToolFirstFeatureFlags } from '@main/store/featureFlags';
import {
  INVOKE_GATE_DENY_REASONS,
  type InvokeGateDenyReason,
} from './invokeGateReasons';
import {
  isToolOnlyActionTargetSupported,
  resolveToolFirstTarget,
} from './toolFirstTarget';

export {
  INVOKE_GATE_DENY_REASONS,
  INVOKE_GATE_DENY_REASON_CATALOG,
} from './invokeGateReasons';
export type { InvokeGateDenyReason } from './invokeGateReasons';

export const ACTION_INTENT_VERSION = 'v1';
export const GATE_DECISION_VERSION = 'v1';
export type GateAuthState = 'unknown' | 'valid' | 'invalid';

const RISK_TIERS = ['low', 'medium', 'high'] as const;
type ActionRiskTier = (typeof RISK_TIERS)[number];

const SUPPORTED_ACTION_TYPES = new Set<string>([
  'wait',
  'mouse_move',
  'hover',
  'click',
  'left_click',
  'left_single',
  'left_double',
  'double_click',
  'right_click',
  'right_single',
  'middle_click',
  'left_click_drag',
  'drag',
  'select',
  'type',
  'hotkey',
  'press',
  'release',
  'navigate',
  'navigate_back',
  'scroll',
  'error_env',
  'call_user',
  'finished',
  'user_stop',
]);

const TOOL_ONLY_ACTION_TYPES = new Set<string>([
  'app.launch',
  'app_launch',
  'window.focus',
  'window_focus',
  'window.wait_ready',
  'window_wait_ready',
]);

const ACTION_TYPES_REQUIRING_START_BOX = new Set<string>([
  'mouse_move',
  'hover',
  'click',
  'left_click',
  'left_single',
  'left_double',
  'double_click',
  'right_click',
  'right_single',
  'middle_click',
  'left_click_drag',
  'drag',
  'select',
]);

const ActionIntentV1Schema = z.object({
  version: z.literal(ACTION_INTENT_VERSION),
  intentId: z.string().min(1),
  sessionId: z.string().min(1),
  operation: z.string().min(1),
  actionType: z.string(),
  riskTier: z.enum(RISK_TIERS),
  confidence: z.number().min(0).max(1),
  source: z.literal('parser'),
  args: z.record(z.unknown()),
});

const GateDecisionV1Schema = z.object({
  version: z.literal(GATE_DECISION_VERSION),
  intentId: z.string().min(1),
  decision: z.enum(['allow', 'deny']),
  reasonCodes: z.array(z.enum(INVOKE_GATE_DENY_REASONS)),
  authState: z.enum(['unknown', 'valid', 'invalid']),
  loopBudgetRemaining: z.number().finite(),
  evaluatedAt: z.number().int(),
});

export type ActionIntentV1 = z.infer<typeof ActionIntentV1Schema>;
export type GateDecisionV1 = z.infer<typeof GateDecisionV1Schema>;

type GateContext = {
  featureFlags: ToolFirstFeatureFlags;
  authState: GateAuthState;
  loopBudgetRemaining: number;
};

const getRiskTierByActionType = (actionType: string): ActionRiskTier => {
  if (
    [
      'type',
      'hotkey',
      'press',
      'release',
      'navigate',
      'navigate_back',
      'app.launch',
      'app_launch',
      'drag',
      'left_click_drag',
    ].includes(actionType)
  ) {
    return 'high';
  }

  if (
    [
      'mouse_move',
      'hover',
      'click',
      'left_click',
      'left_single',
      'left_double',
      'double_click',
      'right_click',
      'right_single',
      'middle_click',
      'window.focus',
      'window_focus',
      'scroll',
      'select',
    ].includes(actionType)
  ) {
    return 'medium';
  }

  return 'low';
};

export const buildActionIntentV1 = (params: {
  sessionId: string;
  parsedPrediction: PredictionParsed;
}): ActionIntentV1 => {
  const actionType = params.parsedPrediction.action_type.trim().toLowerCase();

  return ActionIntentV1Schema.parse({
    version: ACTION_INTENT_VERSION,
    intentId: randomUUID(),
    sessionId: params.sessionId,
    operation: `legacy.action.${actionType || 'unknown'}`,
    actionType,
    riskTier: getRiskTierByActionType(actionType),
    confidence: 1,
    source: 'parser',
    args: { ...(params.parsedPrediction.action_inputs || {}) },
  });
};

export const evaluateInvokeGate = (
  intent: ActionIntentV1,
  context: GateContext,
): GateDecisionV1 => {
  const reasonCodes: InvokeGateDenyReason[] = [];
  const loopBudgetRemaining = Number.isFinite(context.loopBudgetRemaining)
    ? Math.max(0, context.loopBudgetRemaining)
    : 0;

  if (!context.featureFlags.ffInvokeGate) {
    return GateDecisionV1Schema.parse({
      version: GATE_DECISION_VERSION,
      intentId: intent.intentId,
      decision: 'allow',
      reasonCodes: ['invoke_gate_disabled'],
      authState: context.authState,
      loopBudgetRemaining,
      evaluatedAt: Date.now(),
    });
  }

  if (loopBudgetRemaining <= 0) {
    reasonCodes.push('loop_budget_exhausted');
  }

  if (!intent.actionType) {
    reasonCodes.push('action_type_missing');
  }

  const toolRoutingEnabled =
    context.featureFlags.ffToolRegistry &&
    context.featureFlags.ffToolFirstRouting;
  const toolTarget = resolveToolFirstTarget(intent.args);
  const toolTargetSupported =
    !!toolTarget &&
    isToolOnlyActionTargetSupported({
      actionType: intent.actionType,
      target: toolTarget,
      platform: process.platform,
    });
  const actionSupported =
    SUPPORTED_ACTION_TYPES.has(intent.actionType) ||
    (toolRoutingEnabled &&
      TOOL_ONLY_ACTION_TYPES.has(intent.actionType) &&
      toolTargetSupported);

  if (intent.actionType && !actionSupported) {
    reasonCodes.push('action_type_unsupported');
  }

  if (ACTION_TYPES_REQUIRING_START_BOX.has(intent.actionType)) {
    const startBox = intent.args.start_box;
    if (typeof startBox !== 'string' || !startBox.trim()) {
      reasonCodes.push('start_box_required');
    }
  }

  if (context.authState === 'invalid' && intent.riskTier !== 'low') {
    reasonCodes.push('auth_state_invalid');
  }

  return GateDecisionV1Schema.parse({
    version: GATE_DECISION_VERSION,
    intentId: intent.intentId,
    decision: reasonCodes.length > 0 ? 'deny' : 'allow',
    reasonCodes,
    authState: context.authState,
    loopBudgetRemaining,
    evaluatedAt: Date.now(),
  });
};

export const isToolOnlyActionType = (actionType: string): boolean => {
  return TOOL_ONLY_ACTION_TYPES.has(actionType.trim().toLowerCase());
};
