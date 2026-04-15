/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordingOperator } from '../recording-operator';
import type { Operator, ScreenshotOutput, ExecuteParams, ExecuteOutput } from '@ui-tars/sdk/core';

describe('RecordingOperator', () => {
  let mockBaseOp: Operator;
  let recordingOp: RecordingOperator;

  const createScreenshotOutput = (base64 = 'mock-screenshot'): ScreenshotOutput => ({
    base64,
    scaleFactor: 2,
  });

  const createExecuteParams = (
    actionType = 'click',
    coords = [100, 200],
    thought = '我要点击【按钮】',
  ): ExecuteParams =>
    ({
      parsedPrediction: {
        action_type: actionType,
        action_inputs: { start_coords: coords },
        thought,
      },
    }) as unknown as ExecuteParams;

  beforeEach(() => {
    mockBaseOp = {
      screenshot: vi.fn().mockResolvedValue(createScreenshotOutput()),
      execute: vi.fn().mockResolvedValue({} as ExecuteOutput),
    } as unknown as Operator;

    recordingOp = new RecordingOperator(mockBaseOp);
  });

  describe('screenshot', () => {
    it('should delegate to base operator and cache last screenshot', async () => {
      const result = await recordingOp.screenshot();

      expect(mockBaseOp.screenshot).toHaveBeenCalled();
      expect(result.base64).toBe('mock-screenshot');
      expect(recordingOp.getLastScreenshot()).toBe('mock-screenshot');
    });
  });

  describe('execute', () => {
    it('should delegate to base operator', async () => {
      const params = createExecuteParams();
      await recordingOp.execute(params);

      expect(mockBaseOp.execute).toHaveBeenCalledWith(params);
    });

    it('should record click actions with screenshot before', async () => {
      await recordingOp.screenshot(); // Set last screenshot
      await recordingOp.execute(createExecuteParams('click', [100, 200]));

      const actions = recordingOp.getActions();
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('click');
      expect(actions[0].inputs).toEqual({ start_coords: [100, 200] });
      expect(actions[0].thought).toBe('我要点击【按钮】');
      expect(actions[0].screenshotBefore).toBe('mock-screenshot');
    });

    it('should record non-click actions', async () => {
      await recordingOp.execute(createExecuteParams('scroll', [200, 300], '向上滚动'));

      const actions = recordingOp.getActions();
      expect(actions[0].type).toBe('scroll');
    });

    it('should auto-finish after repeated clicks at same position', async () => {
      // Click same position 4 times
      for (let i = 0; i < 4; i++) {
        await recordingOp.execute(createExecuteParams('click', [100, 200]));
      }

      const actions = recordingOp.getActions();
      const finishedAction = actions.find((a) => a.type === 'finished');
      expect(finishedAction).toBeDefined();
      expect(finishedAction?.thought).toBe(
        'Auto-finished due to repeated clicks at same position',
      );
    });

    it('should not auto-finish for different click positions', async () => {
      const positions = [
        [100, 200],
        [200, 300],
        [300, 400],
        [400, 500],
      ];
      for (const pos of positions) {
        await recordingOp.execute(createExecuteParams('click', pos));
      }

      const actions = recordingOp.getActions();
      expect(actions.find((a) => a.type === 'finished')).toBeUndefined();
    });

    it('should take after-screenshot for click actions', async () => {
      await recordingOp.execute(createExecuteParams('click', [100, 200]));

      // Should have called screenshot again for after-screenshot
      expect(mockBaseOp.screenshot).toHaveBeenCalledTimes(1);
      const immediateScreenshots = recordingOp.getImmediateScreenshots();
      expect(immediateScreenshots).toHaveLength(1);
      expect(immediateScreenshots[0].actionIndex).toBe(0);
    });
  });

  describe('getActions', () => {
    it('should return all recorded actions', async () => {
      await recordingOp.execute(createExecuteParams('click', [100, 200]));
      await recordingOp.execute(createExecuteParams('scroll', [200, 300]));
      await recordingOp.execute(createExecuteParams('type'));

      expect(recordingOp.getActions()).toHaveLength(3);
    });

    it('should return empty array initially', () => {
      expect(recordingOp.getActions()).toEqual([]);
    });
  });
});
