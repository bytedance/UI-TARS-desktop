/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
  Operator,
  StatusEnum,
} from '@ui-tars/sdk/core';
import { ConsoleLogger } from '@agent-infra/logger';
import { Base64ImageParser } from '@agent-infra/media-utils';
import { sleep } from '@ui-tars/shared/utils';
import { parseBoxToScreenCoords } from './utils';
import { AIOComputer } from './AIOComputer';
import type { AIOHybridOptions } from './types';
import { AIOBrowser } from './AIOBrowser';
import { log } from 'console';

const logger = new ConsoleLogger('AioHybridOperator');

export class AIOHybridOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `left_double(start_box='[x1, y1, x2, y2]')`,
      `right_single(start_box='[x1, y1, x2, y2]')`,
      `drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `hotkey(key='')`,
      `type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `wait() #Sleep for 5s and take a screenshot to check for any changes.`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  private static currentInstance: AIOHybridOperator | null = null;
  private aioBrowser: AIOBrowser | null = null;
  private aioComputer: AIOComputer;

  private screenshotWidth = 1280;
  private screenshotHeight = 1024;

  public static async create(options: AIOHybridOptions): Promise<AIOHybridOperator> {
    logger.info('[AioHybridOperator] construct:', options.baseURL);
    const instance = new AIOHybridOperator(options);
    await instance.initialize(options);
    this.currentInstance = instance;
    return instance;
  }

  private constructor(options: AIOHybridOptions) {
    super();
    this.aioComputer = new AIOComputer(options);
  }

  private async initialize(options: AIOHybridOptions): Promise<void> {
    this.aioComputer.screenshot(0); // Ping the aio sandbox
    this.aioBrowser = await AIOBrowser.create({
      baseURl: options.baseURL,
      logger: logger,
    });
    await this.aioBrowser?.launch({
      timeout: 1000,
      defaultViewport: { width: 1280, height: 1024 },
    });
    logger.info('[AioHybridOperator] AIOBrowser launched successfully');
    logger.info('[AioHybridOperator] AIOBrowser initialized successfully');
  }

  public async getMeta(): Promise<{ url: string }> {
    let url = '';
    try {
      const retUrl = await this.aioBrowser?.getActiveUrl();
      if (retUrl) {
        url = retUrl;
      }
    } catch (error) {
      logger.error('Failed to get page meta:', error);
    }
    return {
      url,
    };
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    logger.info('[AioHybridOperator] Taking screenshot');

    try {
      const result = await this.aioComputer.screenshot();

      if (!result.success) {
        throw new Error(result.message || 'Screenshot failed');
      }

      // Convert the response to ScreenshotOutput format expected by the SDK
      if (result.data?.base64) {
        const base64Tool = new Base64ImageParser(result.data?.base64);
        const dimensions = base64Tool.getDimensions();
        if (dimensions) {
          this.screenshotWidth = dimensions?.width;
          this.screenshotHeight = dimensions?.height;
        }
        logger.info('[AioHybridOperator] screenshot dimensions:', JSON.stringify(dimensions));
        return {
          base64: result.data.base64,
          scaleFactor: result.data.scaleFactor || 1,
        };
      } else {
        throw new Error('No base64 image data received from screenshot API');
      }
    } catch (error) {
      logger.error('[AioHybridOperator] Screenshot failed:', error);
      throw error;
    }
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { parsedPrediction, screenWidth, screenHeight, scaleFactor } = params;
    const { action_type, action_inputs } = parsedPrediction;
    const startBoxStr = action_inputs?.start_box || '';

    logger.info(
      '[AioHybridOperator] Executing action',
      action_type,
      action_inputs,
      ', screen context',
      this.screenshotWidth,
      this.screenshotHeight,
    );

    const {
      x: rawX,
      y: rawY,
      percentX: rawPercentX,
      percentY: rawPercentY,
    } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth: this.screenshotWidth,
      screenHeight: this.screenshotHeight,
      factors: [1000, 1000],
    });

    const startX = rawX !== null ? Math.round(rawX) : null;
    const startY = rawY !== null ? Math.round(rawY) : null;

    logger.info(`[AioHybridOperator] Action position: (${startX}, ${startY})`);
    logger.info(
      `[AioHybridOperator] Action position percent raw: (${rawPercentX}, ${rawPercentY})`,
    );

    let startXPercent = null,
      startYPercent = null;

    try {
      switch (action_type) {
        case 'navigate':
          logger.info('[AioHybridOperator] Navigating to', action_inputs?.content);
          await this.aioBrowser?.handleNavigate({ url: action_inputs?.content || '' });
          break;
        case 'navigate_back':
          logger.info('[AioHybridOperator] Navigating back');
          await this.aioBrowser?.handleNavigateBack();
          break;
        case 'wait':
          logger.info('[AioHybridOperator] Waiting for 5 seconds');
          await sleep(5000);
          break;

        case 'mouse_move':
        case 'hover':
          if (startX !== null && startY !== null) {
            await this.aioComputer.moveTo(startX, startY);
            startXPercent = rawPercentX;
            startYPercent = rawPercentY;
          }
          break;

        case 'click':
        case 'left_click':
        case 'left_single':
          if (startX !== null && startY !== null) {
            await this.aioComputer.click(startX, startY);
            startXPercent = rawPercentX;
            startYPercent = rawPercentY;
          }
          break;

        case 'left_double':
        case 'double_click':
          if (startX !== null && startY !== null) {
            await this.aioComputer.doubleClick(startX, startY);
            startXPercent = rawPercentX;
            startYPercent = rawPercentY;
          }
          break;

        case 'right_click':
        case 'right_single':
          if (startX !== null && startY !== null) {
            await this.aioComputer.rightClick(startX, startY);
            startXPercent = rawPercentX;
            startYPercent = rawPercentY;
          }
          break;

        case 'middle_click':
          if (startX !== null && startY !== null) {
            await this.aioComputer.click(startX, startY, 'middle');
            startXPercent = rawPercentX;
            startYPercent = rawPercentY;
          }
          break;

        case 'left_click_drag':
        case 'drag':
        case 'select': {
          if (action_inputs?.end_box) {
            const { x: rawEndX, y: rawEndY } = parseBoxToScreenCoords({
              boxStr: action_inputs.end_box,
              screenWidth,
              screenHeight,
            });
            const endX = rawEndX !== null ? Math.round(rawEndX) : null;
            const endY = rawEndY !== null ? Math.round(rawEndY) : null;

            if (startX && startY && endX && endY) {
              // Move to start position, press mouse, drag to end position, release mouse
              await this.aioComputer.moveTo(startX, startY);
              await this.aioComputer.mouseDown();
              await this.aioComputer.dragTo(endX, endY);
              await this.aioComputer.mouseUp();
            }
          }
          break;
        }

        case 'type': {
          const content = action_inputs.content?.trim();
          if (content) {
            const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
            await this.aioComputer.type(stripContent);
          }
          break;
        }

        case 'hotkey':
        case 'press': {
          const keyStr = action_inputs?.key || action_inputs?.hotkey;
          if (keyStr) {
            // 处理组合键
            const keys = keyStr.split(/[\s+]/).filter((k) => k.length > 0);
            if (keys.length > 1) {
              await this.aioComputer.hotkey(keys);
            } else {
              await this.aioComputer.press(keyStr);
            }
          }
          break;
        }

        case 'scroll': {
          const { direction } = action_inputs;
          if (startX !== null && startY !== null && direction) {
            const normalizedDirection = direction.toLowerCase();
            let dx = 0,
              dy = 0;

            switch (normalizedDirection) {
              case 'up':
                dy = 10;
                break;
              case 'down':
                dy = -10;
                break;
              case 'left':
                dx = 10;
                break;
              case 'right':
                dx = -10;
                break;
            }

            if (dx !== 0 || dy !== 0) {
              await this.aioComputer.scroll(dx, dy);
            }
          }
          break;
        }

        case 'error_env':
        case 'call_user':
        case 'finished':
        case 'user_stop':
          break;

        default:
          logger.warn(`Unsupported action type: ${action_type}`);
      }

      // const { startXPercent, startYPercent } = parseBoxToScreenCoordsPercent({
      //   startX,
      //   startY,
      //   screenWidth,
      //   screenHeight,
      //   deviceScaleFactor: scaleFactor,
      // });
      logger.info(
        `[AioHybridOperator] position percent return: (${startXPercent}, ${startYPercent})`,
      );

      // return { status: StatusEnum.INIT };
      return {
        // Hand it over to the upper layer to avoid redundancy
        // @ts-expect-error fix type later
        startX,
        startY,
        // Add percentage coordinates for new GUI Agent design
        startXPercent,
        startYPercent,
        action_inputs,
      };
    } catch (error) {
      logger.error('[AioHybridOperator] 执行失败:', error);
      return { status: StatusEnum.ERROR };
    }
  }
}
