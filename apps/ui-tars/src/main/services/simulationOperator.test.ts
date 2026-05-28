/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { StatusEnum, type ExecuteParams } from '@ui-tars/sdk/core';
import { describe, expect, it, vi } from 'vitest';

import {
  createSimulationOperator,
  isSimulationTerminalAction,
} from './simulationOperator';

describe('simulationOperator', () => {
  it('records and skips non-terminal actions without calling the real operator', async () => {
    const execute = vi.fn(async (_params: ExecuteParams) => ({
      status: StatusEnum.END,
    }));
    const onSimulatedAction = vi.fn();
    const operator = createSimulationOperator({ execute }, onSimulatedAction);

    const result = await operator.execute(
      createExecuteParams({
        action_type: 'left_click',
        action_inputs: {
          start_box: '[10,20,30,40]',
        },
        reflection: null,
        thought: 'Click export.',
      }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(onSimulatedAction).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: StatusEnum.RUNNING,
      simulated: true,
      actionType: 'left_click',
      actionInputs: {
        start_box: '[10,20,30,40]',
      },
    });
  });

  it('ends simulated terminal actions without calling the real operator', async () => {
    const execute = vi.fn(async (_params: ExecuteParams) => ({
      status: StatusEnum.ERROR,
    }));
    const operator = createSimulationOperator({ execute });

    const result = await operator.execute(
      createExecuteParams({
        action_type: 'finished',
        action_inputs: {
          content: 'Done',
        },
        reflection: null,
        thought: 'Task is complete.',
      }),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: StatusEnum.END,
      simulated: true,
      actionType: 'finished',
    });
    expect(isSimulationTerminalAction('call_user')).toBe(true);
    expect(isSimulationTerminalAction('left_click')).toBe(false);
  });
});

function createExecuteParams(
  parsedPrediction: ExecuteParams['parsedPrediction'],
): ExecuteParams {
  return {
    prediction: '',
    parsedPrediction,
    screenWidth: 1280,
    screenHeight: 720,
    scaleFactor: 1,
    factors: [1, 1],
  };
}
