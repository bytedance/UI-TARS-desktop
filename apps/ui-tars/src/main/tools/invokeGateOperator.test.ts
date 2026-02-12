/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it, vi } from 'vitest';

import { StatusEnum } from '@ui-tars/shared/types';
import type { Operator } from '@ui-tars/sdk/core';

import { InvokeGateOperator } from './invokeGateOperator';

vi.mock('@main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvokeGateOperator', () => {
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

  const buildExecuteParams = (actionType: string, startBox = '[1,1,1,1]') => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: actionType,
        action_inputs: { start_box: startBox },
        reflection: null,
        thought: 'execute action',
      },
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };
  };

  it('blocks unsupported actions when invoke gate is enabled', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-1',
      authState: 'valid',
      maxLoopCount: 5,
    });

    await expect(
      gatedOperator.execute(buildExecuteParams('unknown_action') as never),
    ).rejects.toThrow('[INVOKE_GATE_DENY]');

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
  });

  it('passes through actions when invoke gate is disabled', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: false,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-2',
      authState: 'valid',
      maxLoopCount: 5,
    });

    await expect(
      gatedOperator.execute(buildExecuteParams('unknown_action') as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(1);
  });

  it('blocks start-box actions missing start_box', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-3',
      authState: 'valid',
      maxLoopCount: 5,
    });

    await expect(
      gatedOperator.execute(buildExecuteParams('click', '') as never),
    ).rejects.toThrow('start_box_required');
  });
});
