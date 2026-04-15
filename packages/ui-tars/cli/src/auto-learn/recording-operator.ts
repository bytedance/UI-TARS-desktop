/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Operator, type ScreenshotOutput, type ExecuteOutput, type ExecuteParams } from '@ui-tars/sdk/core';
import { sleep } from './app-launcher';
import { extractCoords } from './utils';
import type { ActionRecord } from './types';

/**
 * A decorator Operator that wraps a base operator and records all actions + screenshots.
 * Used during the learning phase to capture element positions and page structure.
 */
export class RecordingOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `type(content='')`,
      `swipe(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `hotkey(key='')`,
      `wait()`,
      `finished()`,
      `call_user()`,
    ],
  };

  actions: ActionRecord[] = [];
  lastScreenshot: string | null = null;
  immediateScreenshots: { actionIndex: number; screenshotAfter: string }[] = [];
  recentClicks: string[] = [];

  constructor(private baseOp: Operator) {
    super();
  }

  override async screenshot(): Promise<ScreenshotOutput> {
    const ss = await this.baseOp.screenshot();
    this.lastScreenshot = ss.base64;
    return ss;
  }

  override async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const result = await this.baseOp.execute(params);

    if (params.parsedPrediction?.action_type) {
      const { action_type, action_inputs } = params.parsedPrediction;
      const coords = extractCoords(action_inputs);
      const clickPos =
        coords.length >= 2
          ? `${Math.round(coords[0])},${Math.round(coords[1])}`
          : 'none';

      // Detect repeated clicks at same position (4+ times -> auto-finish)
      if (action_type === 'click') {
        this.recentClicks.push(clickPos);
        if (this.recentClicks.length > 8) {
          this.recentClicks.shift();
        }

        const sameClickCount = this.recentClicks.filter((p) => p === clickPos).length;
        if (sameClickCount >= 4) {
          console.log(
            `[RecordingOperator] WARNING: Same position clicked 4+ times: ${clickPos}. Auto-finishing.`,
          );
          this.actions.push({
            type: 'finished',
            inputs: {},
            thought: 'Auto-finished due to repeated clicks at same position',
            screenshotBefore: this.lastScreenshot || undefined,
            time: Date.now(),
            loopIndex: this.actions.length,
          });
          return result;
        }
      }

      // Record the action
      this.actions.push({
        type: action_type,
        inputs: action_inputs,
        thought: params.parsedPrediction.thought || '',
        screenshotBefore: this.lastScreenshot || undefined,
        time: Date.now(),
        loopIndex: this.actions.length,
      });

      // Take immediate after-screenshot for click actions
      if (action_type === 'click') {
        await sleep(300);
        try {
          const afterSS = await this.baseOp.screenshot();
          this.immediateScreenshots.push({
            actionIndex: this.actions.length - 1,
            screenshotAfter: afterSS.base64,
          });
          this.lastScreenshot = afterSS.base64;
        } catch {
          // If after-screenshot fails, continue without it
        }
      }
    } else if (result) {
      // Log when parsedPrediction is missing but execute returned a result
      console.debug(
        '[RecordingOperator] parsedPrediction missing, action not recorded',
      );
    }

    return result;
  }

  getActions(): ActionRecord[] {
    return this.actions;
  }

  getImmediateScreenshots(): { actionIndex: number; screenshotAfter: string }[] {
    return this.immediateScreenshots;
  }

  getLastScreenshot(): string | null {
    return this.lastScreenshot;
  }
}
