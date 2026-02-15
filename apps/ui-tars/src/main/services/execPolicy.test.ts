/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatusEnum } from '@ui-tars/shared/types';
import type { Operator } from '@ui-tars/sdk/core';

import { InvokeGateOperator } from '@main/tools/invokeGateOperator';

import {
  adaptExecPolicyV1ToLegacyAllowDeny,
  evaluateExecPolicyV1,
} from './execPolicy';
import { ReliabilityObservabilityService } from './reliabilityObservability';

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const buildIntent = (operation: string) => ({
  intentId: 'intent-1',
  operation,
  actionType: 'click',
});

const createInnerOperator = () => {
  const execute = vi.fn().mockResolvedValue({ status: StatusEnum.RUNNING });
  const screenshot = vi.fn().mockResolvedValue({
    base64: 'dGVzdA==',
    scaleFactor: 1,
  });

  return {
    execute,
    screenshot,
    constructor: {
      MANUAL: {
        ACTION_SPACES: ["click(start_box='[x1, y1, x2, y2]')"],
      },
    },
  } as unknown as Operator;
};

describe('execPolicy', () => {
  beforeEach(() => {
    ReliabilityObservabilityService.getInstance().resetForTests();
  });

  it('invalid config denies with explicit reason', () => {
    const decision = evaluateExecPolicyV1({
      intent: buildIntent('legacy.action.click'),
      config: {
        host: 'invalid-host' as never,
      },
    });

    expect(decision.decision).toBe('deny');
    expect(decision.reasonCodes).toEqual(['policy_config_invalid']);
  });

  it('evaluates allow deny ask matrix for gateway policy', () => {
    const allowDecision = evaluateExecPolicyV1({
      intent: buildIntent('legacy.action.click'),
      config: {
        host: 'gateway',
        security: 'allowlist',
        ask: 'off',
        allowlist: ['legacy.action.*'],
      },
    });
    const askDecision = evaluateExecPolicyV1({
      intent: buildIntent('legacy.action.type'),
      config: {
        host: 'gateway',
        security: 'allowlist',
        ask: 'on-miss',
        allowlist: ['legacy.action.click'],
      },
    });
    const denyDecision = evaluateExecPolicyV1({
      intent: buildIntent('legacy.action.type'),
      config: {
        host: 'gateway',
        security: 'deny',
        ask: 'off',
        allowlist: [],
      },
    });

    expect(allowDecision.decision).toBe('allow');
    expect(allowDecision.reasonCodes).toEqual(['allowlist_match']);
    expect(askDecision.decision).toBe('ask');
    expect(askDecision.reasonCodes).toEqual([
      'allowlist_miss',
      'ask_mode_on_miss',
    ]);
    expect(denyDecision.decision).toBe('deny');
    expect(denyDecision.reasonCodes).toEqual(['security_mode_deny']);
  });

  it('keeps backward-compatible allow deny adapter for ask decision', () => {
    const askDecision = evaluateExecPolicyV1({
      intent: buildIntent('legacy.action.type'),
      config: {
        host: 'gateway',
        security: 'allowlist',
        ask: 'on-miss',
        allowlist: ['legacy.action.click'],
      },
    });

    const legacy = adaptExecPolicyV1ToLegacyAllowDeny(askDecision);

    expect(legacy.decision).toBe('allow');
    expect(legacy.mappedFrom).toBe('ask');
  });

  it('dry run emits decisions and remains non-blocking', async () => {
    const observability = ReliabilityObservabilityService.getInstance();
    const makeOperator = (
      sessionId: string,
      config?: Parameters<typeof evaluateExecPolicyV1>[0]['config'],
    ) => {
      const innerOperator = createInnerOperator();
      const gatedOperator = new InvokeGateOperator({
        innerOperator,
        featureFlags: {
          ffToolRegistry: true,
          ffInvokeGate: true,
          ffToolFirstRouting: false,
        },
        sessionId,
        authState: 'valid',
        maxLoopCount: 5,
        execPolicyConfig: config,
      });

      return { gatedOperator, innerOperator };
    };

    const executeParams = {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: 'click',
        action_inputs: { start_box: '[1,1,1,1]' },
        reflection: null,
        thought: 'click',
      },
      loopCount: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };

    const allowCase = makeOperator('session-dry-run-allow', {
      host: 'sandbox',
      security: 'deny',
      ask: 'on-miss',
      allowlist: [],
    });
    const askCase = makeOperator('session-dry-run-ask', {
      host: 'gateway',
      security: 'allowlist',
      ask: 'on-miss',
      allowlist: ['legacy.action.navigate'],
    });
    const denyCase = makeOperator('session-dry-run-deny', {
      host: 'gateway',
      security: 'deny',
      ask: 'off',
      allowlist: [],
    });

    await expect(
      allowCase.gatedOperator.execute(executeParams as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      askCase.gatedOperator.execute(executeParams as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      denyCase.gatedOperator.execute(executeParams as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (
        allowCase.innerOperator as never as {
          execute: ReturnType<typeof vi.fn>;
        }
      ).execute,
    ).toHaveBeenCalledTimes(1);
    expect(
      (askCase.innerOperator as never as { execute: ReturnType<typeof vi.fn> })
        .execute,
    ).toHaveBeenCalledTimes(1);
    expect(
      (denyCase.innerOperator as never as { execute: ReturnType<typeof vi.fn> })
        .execute,
    ).toHaveBeenCalledTimes(1);

    const snapshot = observability.getDashboardSnapshot();
    const policyDryRunEvents = snapshot.latestEvents.filter(
      (event) =>
        event.type === 'gate.decision' &&
        !!event.reasonCodes?.some((reasonCode) =>
          [
            'host_sandbox_passthrough',
            'allowlist_miss',
            'security_mode_deny',
          ].includes(reasonCode),
        ),
    );

    expect(policyDryRunEvents.some((event) => event.status === 'allow')).toBe(
      true,
    );
    expect(policyDryRunEvents.some((event) => event.status === 'ask')).toBe(
      true,
    );
    expect(policyDryRunEvents.some((event) => event.status === 'deny')).toBe(
      true,
    );
  });
});
