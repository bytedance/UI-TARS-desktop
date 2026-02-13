/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { TOOL_FIRST_FEATURE_FLAG_DEFAULTS } from '@main/store/featureFlags';

import { buildActionIntentV1, evaluateInvokeGate } from './invokeGate';

const withMockedPlatform = <T>(platform: NodeJS.Platform, run: () => T): T => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });
  try {
    return run();
  } finally {
    if (descriptor) {
      Object.defineProperty(process, 'platform', descriptor);
    }
  }
};

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

  it('denies mutating tool actions when auth state is invalid', () => {
    const appLaunchIntent = buildActionIntentV1({
      sessionId: 'session-3b',
      parsedPrediction: {
        action_type: 'app.launch',
        action_inputs: { content: 'notepad' },
        reflection: null,
        thought: 'launch app',
      },
    });
    const windowFocusIntent = buildActionIntentV1({
      sessionId: 'session-3c',
      parsedPrediction: {
        action_type: 'window.focus',
        action_inputs: { content: 'cursor' },
        reflection: null,
        thought: 'focus window',
      },
    });

    const appLaunchDecision = evaluateInvokeGate(appLaunchIntent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      authState: 'invalid',
      loopBudgetRemaining: 10,
    });
    const windowFocusDecision = evaluateInvokeGate(windowFocusIntent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      authState: 'invalid',
      loopBudgetRemaining: 10,
    });

    expect(appLaunchDecision.decision).toBe('deny');
    expect(appLaunchDecision.reasonCodes).toContain('auth_state_invalid');
    expect(windowFocusDecision.decision).toBe('deny');
    expect(windowFocusDecision.reasonCodes).toContain('auth_state_invalid');
  });

  it('denies tool-only actions when tool-first feature flags are disabled', () => {
    const toolIntent = buildActionIntentV1({
      sessionId: 'session-3d',
      parsedPrediction: {
        action_type: 'app.launch',
        action_inputs: { content: 'notepad' },
        reflection: null,
        thought: 'launch app',
      },
    });

    const routingDisabledDecision = evaluateInvokeGate(toolIntent, {
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    const registryDisabledDecision = evaluateInvokeGate(toolIntent, {
      featureFlags: {
        ffToolRegistry: false,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(routingDisabledDecision.decision).toBe('deny');
    expect(routingDisabledDecision.reasonCodes).toContain(
      'action_type_unsupported',
    );
    expect(registryDisabledDecision.decision).toBe('deny');
    expect(registryDisabledDecision.reasonCodes).toContain(
      'action_type_unsupported',
    );
  });

  it('allows modeled navigate/release/tool actions when invoke gate and tool-first flags are enabled', () => {
    const flags = {
      ffToolRegistry: true,
      ffInvokeGate: true,
      ffToolFirstRouting: true,
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
    const toolIntent = buildActionIntentV1({
      sessionId: 'session-5b',
      parsedPrediction: {
        action_type: 'app.launch',
        action_inputs: { content: 'notepad' },
        reflection: null,
        thought: 'launch via tool',
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
    const toolDecision = evaluateInvokeGate(toolIntent, {
      featureFlags: flags,
      authState: 'valid',
      loopBudgetRemaining: 10,
    });

    expect(navigateDecision.decision).toBe('allow');
    expect(navigateDecision.reasonCodes).toEqual([]);
    expect(releaseDecision.decision).toBe('allow');
    expect(releaseDecision.reasonCodes).toEqual([]);
    expect(toolDecision.decision).toBe('allow');
    expect(toolDecision.reasonCodes).toEqual([]);
  });

  it('denies host-unsupported tool-only action types', () => {
    withMockedPlatform('linux', () => {
      const windowFocusIntent = buildActionIntentV1({
        sessionId: 'session-5c',
        parsedPrediction: {
          action_type: 'window.focus',
          action_inputs: { content: 'cursor' },
          reflection: null,
          thought: 'focus on unsupported host',
        },
      });
      const appLaunchCursorIntent = buildActionIntentV1({
        sessionId: 'session-5d',
        parsedPrediction: {
          action_type: 'app.launch',
          action_inputs: { content: 'cursor' },
          reflection: null,
          thought: 'launch unsupported target on host',
        },
      });

      const windowFocusDecision = evaluateInvokeGate(windowFocusIntent, {
        featureFlags: {
          ffToolRegistry: true,
          ffInvokeGate: true,
          ffToolFirstRouting: true,
        },
        authState: 'valid',
        loopBudgetRemaining: 10,
      });
      const appLaunchCursorDecision = evaluateInvokeGate(
        appLaunchCursorIntent,
        {
          featureFlags: {
            ffToolRegistry: true,
            ffInvokeGate: true,
            ffToolFirstRouting: true,
          },
          authState: 'valid',
          loopBudgetRemaining: 10,
        },
      );

      expect(windowFocusDecision.decision).toBe('deny');
      expect(windowFocusDecision.reasonCodes).toContain(
        'action_type_unsupported',
      );
      expect(appLaunchCursorDecision.decision).toBe('deny');
      expect(appLaunchCursorDecision.reasonCodes).toContain(
        'action_type_unsupported',
      );
    });
  });

  it('denies mutating tool action with ambiguous target when confidence layer is enabled', () => {
    withMockedPlatform('win32', () => {
      const intent = buildActionIntentV1({
        sessionId: 'session-5e',
        parsedPrediction: {
          action_type: 'app.launch',
          action_inputs: { content: 'open cursor or settings' },
          reflection: null,
          thought: 'ambiguous target',
        },
      });

      const decision = evaluateInvokeGate(intent, {
        featureFlags: {
          ffToolRegistry: true,
          ffInvokeGate: true,
          ffToolFirstRouting: true,
          ffConfidenceLayer: true,
        },
        authState: 'valid',
        loopBudgetRemaining: 10,
      });

      expect(decision.decision).toBe('deny');
      expect(decision.reasonCodes).toContain('identity_confidence_low');
    });
  });

  it('allows mutating tool action with explicit target when confidence layer is enabled', () => {
    withMockedPlatform('win32', () => {
      const intent = buildActionIntentV1({
        sessionId: 'session-5f',
        parsedPrediction: {
          action_type: 'app.launch',
          action_inputs: { content: 'settings' },
          reflection: null,
          thought: 'explicit target',
        },
      });

      const decision = evaluateInvokeGate(intent, {
        featureFlags: {
          ffToolRegistry: true,
          ffInvokeGate: true,
          ffToolFirstRouting: true,
          ffConfidenceLayer: true,
        },
        authState: 'valid',
        loopBudgetRemaining: 10,
      });

      expect(decision.decision).toBe('allow');
      expect(decision.reasonCodes).toEqual([]);
    });
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
