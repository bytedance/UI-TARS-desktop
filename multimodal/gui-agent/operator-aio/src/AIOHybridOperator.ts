/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  BaseAction,
  Coordinates,
  ExecuteOutput,
  ExecuteParams,
  ScreenshotOutput,
  SupportedActionType,
} from '@gui-agent/shared/types';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { Base64ImageParser } from '@agent-infra/media-utils';

import { AIOComputer, keyNameMap } from './AIOComputer';
import { AIOBrowser } from './AIOBrowser';
import type { AIOHybridOptions } from './types';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class AIOHybridOperator extends Operator {
  private options: AIOHybridOptions;

  protected logger: ConsoleLogger;
  protected aioBrowser: AIOBrowser | null = null;
  protected aioComputer: AIOComputer;

  private screenshotWidth = 1280;
  private screenshotHeight = 1024;

  constructor(options: AIOHybridOptions, logger: ConsoleLogger = defaultLogger) {
    super();
    this.options = options;
    this.logger = logger.spawn('[AIOHybridOperator]');
    this.aioComputer = new AIOComputer(options);
  }

  protected async initialize(): Promise<void> {
    await this.aioComputer.screenshot(0); // Ping the aio sandbox
    this.aioBrowser = await AIOBrowser.create({
      baseURl: this.options.baseURL,
      logger: this.logger,
    });
    await this.aioBrowser?.launch({
      timeout: 1000,
      // @ts-ignore
      defaultViewport: { width: 0, height: 0, deviceScaleFactor: 0 },
    });
    this.logger.info('AIOBrowser initialized successfully');
  }

  protected supportedActions(): Array<SupportedActionType> {
    return [
      'navigate',
      'navigate_back',
      'wait',
      'mouse_move',
      'click',
      'double_click',
      'right_click',
      'middle_click',
      'drag',
      'type',
      'hotkey',
      'press',
      'scroll',
      'call_user',
      'finished',
    ];
  }

  protected screenContext(): ScreenContext {
    return {
      screenWidth: this.screenshotWidth,
      screenHeight: this.screenshotHeight,
      scaleX: 1,
      scaleY: 1,
    };
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    this.logger.info('Taking Screenshot...');

    try {
      const result = await this.aioComputer.screenshot();

      if (!result.success) {
        throw new Error(`Screenshot failed: ${result.message || 'Unknown error'}`);
      }

      // Convert the response to ScreenshotOutput format expected by the SDK
      if (result.data?.base64) {
        const base64Tool = new Base64ImageParser(result.data?.base64);
        const dimensions = base64Tool.getDimensions();
        if (dimensions) {
          this.screenshotWidth = dimensions?.width;
          this.screenshotHeight = dimensions?.height;
        }
        this.logger.info('Screenshot size:', JSON.stringify(dimensions));
        return {
          status: 'success',
          base64: result.data.base64,
          url: await this.getCurrentUrl(),
        };
      } else {
        throw new Error('No base64 image data received from screenshot API');
      }
    } catch (error) {
      this.logger.error('Screenshot failed:', error);
      throw error;
    }
  }

  protected async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { actions } = params;
    for (const action of actions) {
      this.logger.info('Execute action', action);
      await this.singleActionExecutor(action);
    }
    return {
      status: 'success',
    };
  }

  async singleActionExecutor(action: BaseAction): Promise<ExecuteOutput> {
    const { type: actionType, inputs: actionInputs } = action;
    this.logger.info(
      'Executing action',
      actionType,
      actionInputs,
      ', screen context',
      await this.getScreenContext(),
    );

    let startXPercent = null,
      startYPercent = null;

    try {
      switch (actionType) {
        case 'navigate': {
          const { url, content } = actionInputs;
          if (!url && !content) {
            throw new Error('url is required when navigate');
          }
          this.logger.info('Navigating to', url || content);
          await this.aioBrowser?.handleNavigate({ url: url || content });
          break;
        }
        case 'navigate_back': {
          this.logger.info('Navigating back');
          await this.aioBrowser?.handleNavigateBack();
          break;
        }
        case 'move':
        case 'move_to':
        case 'mouse_move':
        case 'hover': {
          const { point } = actionInputs;
          if (!point) {
            throw new Error('point is required when mouse move');
          }
          const { realX, realY } = await this.calculateRealCoords(point);
          await this.aioComputer.moveTo(realX, realY);
          startXPercent = (point as Coordinates).normalized?.x;
          startYPercent = (point as Coordinates).normalized?.y;
          break;
        }
        case 'click':
        case 'left_click':
        case 'left_single': {
          await this.handleClick(actionInputs, 'left');
          const { point } = actionInputs;
          startXPercent = (point as Coordinates)?.normalized?.x;
          startYPercent = (point as Coordinates)?.normalized?.y;
          break;
        }
        case 'left_double':
        case 'double_click': {
          await this.handleClick(actionInputs, 'left', 2);
          const { point } = actionInputs;
          startXPercent = (point as Coordinates)?.normalized?.x;
          startYPercent = (point as Coordinates)?.normalized?.y;
          break;
        }
        case 'right_click':
        case 'right_single': {
          await this.handleClick(actionInputs, 'right');
          const { point } = actionInputs;
          startXPercent = (point as Coordinates)?.normalized?.x;
          startYPercent = (point as Coordinates)?.normalized?.y;
          break;
        }
        case 'middle_click': {
          await this.handleClick(actionInputs, 'middle');
          const { point } = actionInputs;
          startXPercent = (point as Coordinates)?.normalized?.x;
          startYPercent = (point as Coordinates)?.normalized?.y;
          break;
        }
        case 'left_click_drag':
        case 'drag':
        case 'select': {
          await this.handleDrag(actionInputs);
          break;
        }
        case 'type': {
          const content = actionInputs.content?.trim();
          if (!content) {
            throw new Error('content is required when type');
          }
          const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
          await this.aioComputer.type(stripContent);
          break;
        }
        case 'hotkey':
        case 'press': {
          const keyStr = actionInputs?.key || actionInputs?.hotkey;
          if (typeof keyStr !== 'string') {
            throw new Error('key string is required when press or hotkey');
          }
          const lowerKeyStr: string = keyStr.toLowerCase();
          const keys = lowerKeyStr.split(/\s+/).filter((k) => k.length > 0);

          // Validate and map each key in the hotkey combination
          const mappedKeys = keys.map((key) => {
            return keyNameMap[key as keyof typeof keyNameMap] || key;
          });
          if (mappedKeys.length === 0) {
            throw new Error('key string is required when press or hotkey');
          }

          this.logger.info('Press/hotkey action mappedKeys:', mappedKeys.join('+'));
          if (mappedKeys.length > 1) {
            await this.aioComputer.hotkey(mappedKeys);
          } else {
            await this.aioComputer.press(mappedKeys[0]);
          }
          break;
        }
        case 'scroll': {
          await this.handleScroll(actionInputs);
          break;
        }
        case 'wait':
          this.logger.info('Waiting for 3 seconds');
          let sleepTime = 3000;
          if (actionInputs?.time) {
            sleepTime = actionInputs.time * 1000;
          }
          await new Promise((resolve) => setTimeout(resolve, sleepTime));
          break;
        default:
          this.logger.warn(`Unsupported action type: ${actionType}`);
          throw new Error(`Unsupported action type: ${actionType}`);
      }

      this.logger.info(`position percent return: (${startXPercent}, ${startYPercent})`);

      return {
        status: 'success',
        // Hand it over to the upper layer to avoid redundancy
        // startX,
        // startY,
        // Add percentage coordinates for new GUI Agent design
        startXPercent,
        startYPercent,
        actionInputs,
      };
    } catch (error) {
      this.logger.error('Execute action failed:', error);
      throw new Error(`Execute action failed: ${actionType}, message: ${(error as Error).message}`);
    }
  }

  private async getCurrentUrl(): Promise<string | undefined> {
    try {
      const retUrl = await this.aioBrowser?.getActiveUrl();
      if (retUrl) {
        return retUrl;
      }
    } catch (error) {
      this.logger.warn('Failed to get page url:', error);
    }
  }

  private async calculateRealCoords(
    coords: Coordinates,
  ): Promise<{ realX: number; realY: number }> {
    if (!coords.normalized) {
      if (!coords.raw) {
        throw new Error('Invalide coordinates');
      }
      return {
        realX: coords.raw.x,
        realY: coords.raw.y,
      };
    }
    const screenContext = await this.getScreenContext();
    return {
      realX: coords.normalized.x * screenContext.screenWidth * screenContext.scaleX,
      realY: coords.normalized.y * screenContext.screenHeight * screenContext.scaleY,
    };
  }

  private async handleClick(
    actionInputs: Record<string, unknown>,
    button: 'left' | 'right' | 'middle',
    clickNum: 1 | 2 = 1,
  ) {
    const { point } = actionInputs;
    if (!point) {
      throw new Error('point is required when click');
    }
    const { realX, realY } = await this.calculateRealCoords(point);
    if (clickNum === 1) {
      if (button === 'left') {
        await this.aioComputer.click(realX, realY);
      } else if (button === 'right') {
        await this.aioComputer.rightClick(realX, realY);
      } else if (button === 'middle') {
        await this.aioComputer.click(realX, realY, 'middle');
      }
    } else {
      await this.aioComputer.doubleClick(realX, realY);
    }
  }

  private async handleDrag(actionInputs: Record<string, unknown>) {
    const { start: startPoint, end: endPoint } = actionInputs;
    if (!startPoint) {
      throw new Error('start point is required when drag/select');
    }
    if (!endPoint) {
      throw new Error('end point is required when drag/select');
    }
    const { realX: startX, realY: startY } = await this.calculateRealCoords(startPoint);
    const { realX: endX, realY: endY } = await this.calculateRealCoords(endPoint);
    // if (startX > endX || startY > endY) {
    //   throw new Error('start point must be top left of end point');
    // }
    // Move to start position, press mouse, drag to end position, release mouse
    await this.aioComputer.moveTo(startX, startY);
    await this.aioComputer.mouseDown();
    await this.aioComputer.dragTo(endX, endY);
    await this.aioComputer.mouseUp();
  }

  private async handleScroll(actionInputs: Record<string, unknown>) {
    const { direction, point } = actionInputs;
    // if startX and startY is not null, move mouse to
    if (point) {
      const { realX, realY } = await this.calculateRealCoords(point);
      await this.aioComputer.moveTo(realX, realY);
    }
    if (typeof direction !== 'string') {
      throw new Error('direction is required when scroll');
    }
    const normalizedDirection = direction.toLowerCase();
    let dx = 0;
    let dy = 0;
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
}
