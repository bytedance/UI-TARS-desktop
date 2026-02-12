/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { TOOL_FIRST_FEATURE_FLAG_DEFAULTS } from '@main/store/featureFlags';

import { buildActionIntentV1, evaluateInvokeGate } from './invokeGate';

describe('invokeGate', () => {
  it('allows when invoke gate flag is disabled', () => {
    const intent = buildActionIntentV1({
      sessionId: 'session-1',
      parsedPrediction: {
        action_type: 'click',
        action_inputs: { start_box: '[1,1,1,1]' },
        reflection: null,
        thought: 'click it',
      },
    });

    const decision = evaluateInvokeGate(intent, {
      featureFlags: TOOL_FIRST_FEATURE_FLAG_DEFAULTS,
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(decision.decision).toBe('allow');
    expect(decision.reasonCodes).toEqual(['invoke_gate_disabled']);
  });

  it('denies unsupported action type when invoke gate is enabled', () => {
    const intent = buildActionIntentV1({
      sessionId: 'session-2',
      parsedPrediction: {
        action_type: 'open_terminal',
        action_inputs: {},
        reflection: null,
        thought: 'unknown action',
      },
    });

    const decision = evaluateInvokeGate(intent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reasonCodes).toContain('action_type_unsupported');
  });

  it('denies mutating action when auth state is invalid', () => {
    const intent = buildActionIntentV1({
      sessionId: 'session-3',
      parsedPrediction: {
        action_type: 'type',
        action_inputs: { content: 'hello' },
        reflection: null,
        thought: 'type',
      },
    });

    const decision = evaluateInvokeGate(intent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      authState: 'invalid',
      loopBudgetRemaining: 10,
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reasonCodes).toContain('auth_state_invalid');
  });

  it('allows modeled navigate and release actions when invoke gate is enabled', () => {
    const flags = {
      ffToolRegistry: true,
      ffInvokeGate: true,
      ffToolFirstRouting: false,
    };

    const navigateIntent = buildActionIntentV1({
      sessionId: 'session-4',
      parsedPrediction: {
        action_type: 'navigate',
        action_inputs: { content: 'https://example.com' },
        reflection: null,
        thought: 'navigate',
      },
    });
    const releaseIntent = buildActionIntentV1({
      sessionId: 'session-5',
      parsedPrediction: {
        action_type: 'release',
        action_inputs: { key: 'ctrl' },
        reflection: null,
        thought: 'release key',
      },
    });

    const navigateDecision = evaluateInvokeGate(navigateIntent, {
      featureFlags: flags,
      authState: 'valid',
      loopBudgetRemaining: 10,
    });
    const releaseDecision = evaluateInvokeGate(releaseIntent, {
      featureFlags: flags,
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(navigateDecision.decision).toBe('allow');
    expect(navigateDecision.reasonCodes).toEqual([]);
    expect(releaseDecision.decision).toBe('allow');
    expect(releaseDecision.reasonCodes).toEqual([]);
  });

  it('accepts fractional loop budget values without schema failure', () => {
    const intent = buildActionIntentV1({
      sessionId: 'session-6',
      parsedPrediction: {
        action_type: 'click',
        action_inputs: { start_box: '[1,1,1,1]' },
        reflection: null,
        thought: 'fractional budget test',
      },
    });

    const decision = evaluateInvokeGate(intent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      authState: 'valid',
      loopBudgetRemaining: 25.5,
    });

    expect(decision.decision).toBe('allow');
    expect(decision.loopBudgetRemaining).toBe(25.5);
  });

  it('allows scroll action without start_box when invoke gate is enabled', () => {
    const intent = buildActionIntentV1({
      sessionId: 'session-7',
      parsedPrediction: {
        action_type: 'scroll',
        action_inputs: { direction: 'down' },
        reflection: null,
        thought: 'scroll down',
      },
    });

    const decision = evaluateInvokeGate(intent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(decision.decision).toBe('allow');
    expect(decision.reasonCodes).toEqual([]);
  });
});
