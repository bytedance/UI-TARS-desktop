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

  const buildExecuteParams = (
    actionType: string,
    startBox = '[1,1,1,1]',
    loopCount?: number,
    extraActionInputs: Record<string, unknown> = {},
  ) => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: actionType,
        action_inputs: { start_box: startBox, ...extraActionInputs },
        reflection: null,
        thought: 'execute action',
      },
      loopCount,
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };
  };

  const buildToolExecuteParams = (
    actionType: string,
    target: string,
    loopCount?: number,
  ) => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: actionType,
        action_inputs: { content: target },
        reflection: null,
        thought: 'execute tool action',
      },
      loopCount,
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };
  };

  const buildNavigateExecuteParams = () => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: 'navigate',
        action_inputs: { content: 'https://example.com' },
        reflection: null,
        thought: 'navigate action',
      },
      loopCount: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };
  };

  const buildScrollExecuteParams = () => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: 'scroll',
        action_inputs: { direction: 'down' },
        reflection: null,
        thought: 'scroll down',
      },
      loopCount: 1,
      screenWidth: 1920,
      screenHeight: 1080,
      scaleFactor: 1,
      factors: [1, 1],
    };
  };

  const buildWaitExecuteParams = (loopCount?: number) => {
    return {
      prediction: 'Action output',
      parsedPrediction: {
        action_type: 'wait',
        action_inputs: {},
        reflection: null,
        thought: 'wait',
      },
      loopCount,
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

  it('allows navigate action when invoke gate is enabled', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-4',
      authState: 'valid',
      maxLoopCount: 5,
    });

    await expect(
      gatedOperator.execute(buildNavigateExecuteParams() as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(1);
  });

  it('tracks invoke-gate budget by loop count, not action count', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-5',
      authState: 'valid',
      maxLoopCount: 1,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2) as never,
      ),
    ).rejects.toThrow('loop_budget_exhausted');
  });

  it('blocks repeated action patterns when loop guardrails are enabled', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-loop',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 3) as never,
      ),
    ).rejects.toThrow('loop_pattern_repeated');

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(2);
  });

  it('counts repeated intents per loop iteration, not per retry', async () => {
    const innerOperator = createInnerOperator();
    const innerExecute = (
      innerOperator as never as {
        execute: ReturnType<typeof vi.fn>;
      }
    ).execute;
    innerExecute
      .mockRejectedValueOnce(new Error('transient-loop-1'))
      .mockResolvedValueOnce({ status: StatusEnum.RUNNING })
      .mockRejectedValueOnce(new Error('transient-loop-2'))
      .mockResolvedValueOnce({ status: StatusEnum.RUNNING });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-retry',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).rejects.toThrow('transient-loop-1');
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2) as never,
      ),
    ).rejects.toThrow('transient-loop-2');
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 3) as never,
      ),
    ).rejects.toThrow('loop_pattern_repeated');

    expect(innerExecute).toHaveBeenCalledTimes(4);
  });

  it('tracks repeated intents for each action within the same loop iteration', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-same-loop-actions',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).rejects.toThrow('loop_pattern_repeated');

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(2);
  });

  it('ignores derived coordinate args when tracking repeated intents', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-derived-coords',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1, {
          start_coords: [100, 100],
          end_coords: [120, 120],
        }) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2, {
          start_coords: [150, 150],
          end_coords: [170, 170],
        }) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 3, {
          start_coords: [200, 200],
          end_coords: [220, 220],
        }) as never,
      ),
    ).rejects.toThrow('loop_pattern_repeated');

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(2);
  });

  it('preserves repeated-intent streak across low-risk wait actions', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-wait-filler',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(buildWaitExecuteParams(1) as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 2) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(buildWaitExecuteParams(2) as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 3) as never,
      ),
    ).rejects.toThrow('loop_pattern_repeated');

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(4);
  });

  it('treats case-sensitive retry inputs as distinct intent signatures', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-case',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', 'Password', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', 'password', 2) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', 'PASSWORD', 3) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(3);
  });

  it('treats whitespace-variant retry inputs as distinct intent signatures', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
        ffLoopGuardrails: true,
      },
      sessionId: 'session-5-space',
      authState: 'valid',
      maxLoopCount: 10,
    });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', 'password', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', ' password', 2) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('type', 'password ', 3) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(3);
  });

  it('allows scroll action without start_box when invoke gate is enabled', async () => {
    const innerOperator = createInnerOperator();
    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-6',
      authState: 'valid',
      maxLoopCount: 5,
    });

    await expect(
      gatedOperator.execute(buildScrollExecuteParams() as never),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(1);
  });

  it('uses tool-first routing result when handled', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'app.launch',
      fallbackReason: null,
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      sessionId: 'session-7',
      authState: 'valid',
      maxLoopCount: 5,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('app.launch', 'notepad', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(toolFirstRouter).toHaveBeenCalledTimes(1);
    expect(toolFirstRouter).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-7',
        intentId: expect.any(String),
        loopCount: 1,
      }),
    );
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
  });

  it('falls back to visual operator when tool-first route is not handled', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: false,
      status: StatusEnum.RUNNING,
      toolName: null,
      fallbackReason: 'unsupported_action_type',
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: false,
        ffToolFirstRouting: true,
      },
      sessionId: 'session-8',
      authState: 'valid',
      maxLoopCount: 5,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(toolFirstRouter).toHaveBeenCalledTimes(1);
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(1);
  });

  it('applies invoke-gate deny before running tool-first route', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'app.launch',
      fallbackReason: null,
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      sessionId: 'session-9',
      authState: 'valid',
      maxLoopCount: 0,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('app.launch', '[1,1,1,1]', 1) as never,
      ),
    ).rejects.toThrow('loop_budget_exhausted');

    expect(toolFirstRouter).not.toHaveBeenCalled();
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
  });

  it('advances loop budget even when tool-first route handles action', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'window.focus',
      fallbackReason: null,
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      sessionId: 'session-10',
      authState: 'valid',
      maxLoopCount: 1,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('window.focus', 'cursor', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });
    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('window.focus', 'cursor', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('window.focus', 'cursor', 2) as never,
      ),
    ).rejects.toThrow('loop_budget_exhausted');

    expect(toolFirstRouter).toHaveBeenCalledTimes(2);
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
  });

  it('rejects unhandled tool-only action instead of visual fallback', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: false,
      status: StatusEnum.RUNNING,
      toolName: 'app.launch',
      fallbackReason: 'target_unresolved',
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: true,
      },
      sessionId: 'session-11',
      authState: 'valid',
      maxLoopCount: 5,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildToolExecuteParams('app.launch', 'notepad', 1) as never,
      ),
    ).rejects.toThrow('[TOOL_FIRST_ROUTE_UNHANDLED]');

    expect(toolFirstRouter).toHaveBeenCalledTimes(1);
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).not.toHaveBeenCalled();
  });

  it('skips tool-first routing when ffToolFirstRouting is disabled', async () => {
    const innerOperator = createInnerOperator();
    const toolFirstRouter = vi.fn().mockResolvedValue({
      handled: true,
      status: StatusEnum.RUNNING,
      toolName: 'app.launch',
      fallbackReason: null,
    });

    const gatedOperator = new InvokeGateOperator({
      innerOperator,
      featureFlags: {
        ffToolRegistry: true,
        ffInvokeGate: true,
        ffToolFirstRouting: false,
      },
      sessionId: 'session-12',
      authState: 'valid',
      maxLoopCount: 5,
      toolFirstRouter,
    });

    await expect(
      gatedOperator.execute(
        buildExecuteParams('click', '[1,1,1,1]', 1) as never,
      ),
    ).resolves.toEqual({ status: StatusEnum.RUNNING });

    expect(toolFirstRouter).not.toHaveBeenCalled();
    expect(
      (innerOperator as never as { execute: ReturnType<typeof vi.fn> }).execute,
    ).toHaveBeenCalledTimes(1);
  });
});
