/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Coordinates,
  SupportedActionType,
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
  BaseAction,
} from '@gui-agent/shared/types';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import {
  screen,
  Button,
  Key,
  Point,
  keyboard,
  mouse,
  sleep,
  straightTo,
  clipboard,
} from '@computer-use/nut-js';
import { Jimp } from 'jimp';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);

export class NutJSOperator extends Operator {
  private logger: ConsoleLogger;
  private _screenContext: ScreenContext | null = null;

  constructor(logger: ConsoleLogger = defaultLogger) {
    super();
    this.logger = logger.spawn('[NutJSOperator]');
  }

  protected async initialize(): Promise<void> {
    const grabImage = await screen.grab();
    const screenWithScale = await grabImage.toBGR();
    this._screenContext = {
      screenWidth: screenWithScale.width / screenWithScale.pixelDensity.scaleX,
      screenHeight: screenWithScale.height / screenWithScale.pixelDensity.scaleY,
      scaleX: screenWithScale.pixelDensity.scaleX,
      scaleY: screenWithScale.pixelDensity.scaleY,
    };
  }

  protected supportedActions(): Array<SupportedActionType> {
    return [
      'click',
      'right_click',
      'middle_click',
      'double_click',
      'mouse_down',
      'mouse_up',
      'mouse_move',
      'drag',
      'scroll',
      'type',
      'hotkey',
      'press',
      'release',
      'wait',
      'call_user',
      'finished',
    ];
  }

  protected screenContext(): ScreenContext {
    // Assert that _screenContext is not null
    if (!this._screenContext) {
      throw new Error('The Operator not initialized');
    }
    return this._screenContext;
  }

  protected async screenshot(): Promise<ScreenshotOutput> {
    const grabImage = await screen.grab();
    const screenWithScale = await grabImage.toRGB();
    const scaleFactor = screenWithScale.pixelDensity.scaleX;

    // this.logger.info(
    //   'scaleX',
    //   screenWithScale.pixelDensity.scaleX,
    //   'scaleY',
    //   screenWithScale.pixelDensity.scaleY,
    // );

    const screenWithScaleImage = await Jimp.fromBitmap({
      width: screenWithScale.width,
      height: screenWithScale.height,
      data: Buffer.from(screenWithScale.data),
    });

    const width = screenWithScale.width / screenWithScale.pixelDensity.scaleX;
    const height = screenWithScale.height / screenWithScale.pixelDensity.scaleY;

    const physicalScreenImage = await screenWithScaleImage
      .resize({
        w: width,
        h: height,
      })
      .getBuffer('image/jpeg'); // Use png format to avoid compression

    this.logger.info(`screenshot: ${width}x${height}, scaleFactor: ${scaleFactor}`);

    return {
      base64: physicalScreenImage.toString('base64'),
      contentType: 'image/jpeg',
      status: 'success',
    };
  }

  protected async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { actions } = params;
    for (const action of actions) {
      this.logger.info('execute action', JSON.stringify(action));
      await this.singleActionExecutor(action);
    }
    return {
      status: 'success',
    };
  }

  private async singleActionExecutor(action: BaseAction) {
    const { type: actionType, inputs: actionInputs } = action;
    switch (actionType) {
      case 'move':
      case 'move_to':
      case 'mouse_move':
      case 'hover': {
        const { point } = actionInputs;
        if (!point) {
          throw new Error('point is required when mouse move');
        }
        const { realX, realY } = await this.calculateRealCoords(point);
        await this.moveStraightTo(realX, realY);
        break;
      }
      case 'click':
      case 'left_click':
      case 'left_single': {
        await this.handleClick(actionInputs, Button.LEFT);
        break;
      }
      case 'left_double':
      case 'double_click': {
        await this.handleClick(actionInputs, Button.LEFT, 2);
        break;
      }
      case 'right_click':
      case 'right_single': {
        await this.handleClick(actionInputs, Button.RIGHT);
        break;
      }
      case 'middle_click': {
        await this.handleClick(actionInputs, Button.MIDDLE);
        break;
      }
      case 'left_click_drag':
      case 'drag':
      case 'select': {
        // end_box
        const { start: startPoint, end: endPoint } = actionInputs;
        if (!startPoint) {
          throw new Error('start point is required when drag/select');
        }
        if (!endPoint) {
          throw new Error('end point is required when drag/select');
        }

        const { realX: startX, realY: startY } = await this.calculateRealCoords(startPoint);
        const { realX: endX, realY: endY } = await this.calculateRealCoords(endPoint);
        this.logger.info(`drag: start(${startX},${startY}) -> end(${endX},${endY})`);
        // if (startX > endX || startY > endY) {
        //   throw new Error('start point must be top left of end point');
        // }

        await this.moveStraightTo(startX, startY);
        await sleep(100);
        await mouse.drag(straightTo(new Point(endX, endY)));
        break;
      }
      case 'type': {
        const { content: contentStr } = actionInputs;
        const content = contentStr.trim();
        if (!content) {
          throw new Error('content is required when type');
        }
        this.logger.info('type', content);
        const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
        keyboard.config.autoDelayMs = 0;
        if (process.platform === 'win32') {
          const originalClipboard = await clipboard.getContent();
          await clipboard.setContent(stripContent);
          await keyboard.pressKey(Key.LeftControl, Key.V);
          await sleep(50);
          await keyboard.releaseKey(Key.LeftControl, Key.V);
          await sleep(50);
          await clipboard.setContent(originalClipboard);
        } else {
          await keyboard.type(stripContent);
        }
        if (content.endsWith('\n') || content.endsWith('\\n')) {
          await keyboard.pressKey(Key.Enter);
          await keyboard.releaseKey(Key.Enter);
        }
        keyboard.config.autoDelayMs = 500;
        break;
      }
      case 'hotkey': {
        const { key: keyStr } = actionInputs;
        const keys = this.getHotkeys(keyStr);
        await keyboard.pressKey(...keys);
        await keyboard.releaseKey(...keys);
        break;
      }
      case 'press': {
        const { key: keyStr } = actionInputs;
        const keys = this.getHotkeys(keyStr);
        await keyboard.pressKey(...keys);
        break;
      }
      case 'release': {
        const { key: keyStr } = actionInputs;
        const keys = this.getHotkeys(keyStr);
        await keyboard.releaseKey(...keys);
        break;
      }
      case 'scroll': {
        const { direction, point } = actionInputs;
        // if startX and startY is not null, move mouse to
        if (point) {
          const { realX, realY } = await this.calculateRealCoords(point);
          await this.moveStraightTo(realX, realY);
        }
        switch (direction?.toLowerCase()) {
          case 'up':
            await mouse.scrollUp(5 * 100);
            break;
          case 'down':
            await mouse.scrollDown(5 * 100);
            break;
          default:
            this.logger.warn(`Unsupported scroll direction: ${direction}`);
            throw new Error(`Unsupported scroll direction: ${direction}`);
        }
        break;
      }
      case 'wait': {
        this.logger.warn(
          'The operator should not process wait action',
          JSON.stringify(actionInputs),
        );
        let sleepTime = 5000;
        if (actionInputs?.time) {
          sleepTime = actionInputs.time * 1000;
        }
        await sleep(sleepTime);
        break;
      }
      case 'finished':
        this.logger.info('finished, do nothing');
        break;
      default: {
        this.logger.warn(`Unsupported action: ${actionType}`);
        throw new Error(`Unsupported action: ${actionType}`);
      }
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
      realX: coords.normalized.x * screenContext.screenWidth,
      realY: coords.normalized.y * screenContext.screenHeight,
    };
  }

  private async moveStraightTo(startX: number | null, startY: number | null) {
    if (startX === null || startY === null) {
      return;
    }
    await mouse.move(straightTo(new Point(startX, startY)));
  }

  // TODO: the supported keys should be more
  private getHotkeys(keyStr: string | undefined): Key[] {
    if (keyStr) {
      const platformCommandKey = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftWin;
      const platformCtrlKey = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
      const keyMap = {
        return: Key.Enter,
        ctrl: platformCtrlKey,
        shift: Key.LeftShift,
        alt: Key.LeftAlt,
        'page down': Key.PageDown,
        'page up': Key.PageUp,
        meta: platformCommandKey,
        win: platformCommandKey,
        command: platformCommandKey,
        cmd: platformCommandKey,
        ',': Key.Comma,
        arrowup: Key.Up,
        arrowdown: Key.Down,
        arrowleft: Key.Left,
        arrowright: Key.Right,
      } as const;

      const lowercaseKeyMap = Object.fromEntries(
        Object.entries(Key).map(([k, v]) => [k.toLowerCase(), v]),
      ) as {
        [K in keyof typeof Key as Lowercase<K>]: (typeof Key)[K];
      };

      const keys = keyStr
        .split(/[\s+]/)
        .map((k) => k.toLowerCase())
        .map(
          (k) =>
            keyMap[k as keyof typeof keyMap] ?? lowercaseKeyMap[k as Lowercase<keyof typeof Key>],
        )
        .filter(Boolean);
      this.logger.info('getHotkeys: key codes list:', keys);
      return keys;
    } else {
      this.logger.error('getHotkeys error: ', `${keyStr} is not a valid key`);
      throw new Error(`Error: ${keyStr} is not a valid key`);
    }
  }

  private async handleClick(
    actionInputs: Record<string, unknown>,
    button: Button,
    clickNum: 1 | 2 = 1,
  ) {
    const { point } = actionInputs;
    if (!point) {
      throw new Error('point is required when click');
    }
    const { realX, realY } = await this.calculateRealCoords(point);
    await this.moveStraightTo(realX, realY);
    await sleep(100);
    if (clickNum === 2) {
      await mouse.doubleClick(button);
    } else {
      await mouse.click(button);
    }
  }
}
