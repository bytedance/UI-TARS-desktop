/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import {
  Coordinates,
  SupportedActionType,
  ScreenshotOutput,
  ExecuteParams,
  ExecuteOutput,
  BaseAction,
  HotkeyAction,
} from '@gui-agent/shared/types';
import { Operator, ScreenContext } from '@gui-agent/shared/base';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';

import { ADB } from 'appium-adb';

const defaultLogger = new ConsoleLogger(undefined, LogLevel.DEBUG);
const yadbCommand =
  'app_process -Djava.class.path=/data/local/tmp/yadb /data/local/tmp com.ysbing.yadb.Main';
const screenshotPathOnAndroid = '/data/local/tmp/ui_tars_screenshot.png';
const screenshotPathOnLocal = path.join(os.homedir(), 'Downloads', 'ui_tars_screenshot.png');

export class AdbOperator extends Operator {
  private logger: ConsoleLogger;
  private _deviceId: string | null = null;
  private _adb: ADB | null = null;
  private _hasPushedYadb = false;
  private _screenContext: ScreenContext | null = null;

  constructor(logger: ConsoleLogger = defaultLogger) {
    super();
    this.logger = logger.spawn('[AdbOperator]');
  }

  protected async initialize(): Promise<void> {
    this._deviceId = await this.getConnectedDevices();
    this._adb = await ADB.createADB({
      udid: this._deviceId,
      adbExecTimeout: 60000,
    });
    this._screenContext = await this.calculateScreenContext(this._adb);
  }

  protected supportedActions(): Array<SupportedActionType> {
    return [
      'click',
      'double_click',
      'type',
      'long_press',
      'swipe',
      'press_back',
      'press_home',
      'open_app',
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
    // Assert that _adb is not null
    if (!this._adb) {
      throw new Error('The Operator not initialized');
    }
    return await this.screenshotWithFallback();
  }

  protected async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { actions } = params;
    for (const action of actions) {
      this.logger.info('execute action', action);
      await this.singleActionExecutor(action);
    }
    return {
      status: 'success',
    };
  }

  private async singleActionExecutor(action: BaseAction) {
    const { type: actionType, inputs: actionInputs } = action;
    switch (actionType) {
      case 'click': {
        const { point } = actionInputs;
        if (!point) {
          throw new Error('point is required when click');
        }
        const { realX, realY } = await this.calculateRealCoords(point);
        await this.handleClick(realX, realY);
        break;
      }
      case 'long_press': {
        const { point } = actionInputs;
        if (!point) {
          throw new Error('point is required when click');
        }
        const { realX, realY } = await this.calculateRealCoords(point);
        this.handleSwipe({ x: realX, y: realY }, { x: realX, y: realY }, 1500);
        break;
      }
      case 'swipe':
      case 'drag': {
        const { start: startPoint, end: endPoint } = actionInputs;
        if (!startPoint) {
          throw new Error('start point is required when swipe/drag');
        }
        if (!endPoint) {
          throw new Error('end point is required when swipe/drag');
        }
        const { realX: startX, realY: startY } = await this.calculateRealCoords(startPoint);
        const { realX: endX, realY: endY } = await this.calculateRealCoords(endPoint);
        this.handleSwipe({ x: startX, y: startY }, { x: endX, y: endY }, 300);
        break;
      }
      case 'scroll': {
        const { direction, point } = actionInputs;
        if (!direction) {
          throw new Error(`Direction required when scroll`);
        }
        this.handleScroll(direction, point);
        break;
      }
      case 'type': {
        const { content } = actionInputs;
        this.handleType(content);
        break;
      }
      case 'hotkey': {
        const { key } = actionInputs;
        await this.handleHotkey(key);
        break;
      }
      case 'open_app':
        throw new Error('The device does NOT support open app directly');
      case 'home':
      case 'press_home': {
        await this.handleHotkey('home');
        break;
      }
      case 'back':
      case 'press_back': {
        await this.handleHotkey('back');
        break;
      }
      default:
        this.logger.warn(`[AdbOperator] Unsupported action: ${actionType}`);
        throw new Error(`Unsupported action: ${actionType}`);
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

  /**
   * Get all connected Android device IDs
   * @returns List of device IDs
   * @throws Error when unable to retrieve device list
   */
  private async getConnectedDevices(): Promise<string> {
    const execPromise = promisify(exec);
    try {
      const { stdout } = await execPromise('adb devices');
      const devices = stdout
        .split('\n')
        .slice(1) // Skip the first line "List of devices attached"
        .map((line) => {
          const [id, status] = line.split('\t');
          return { id, status };
        })
        .filter(({ id, status }) => id && status && status.trim() === 'device')
        .map(({ id }) => id);

      if (devices.length === 0) {
        throw new Error('No available Android devices found');
      }
      if (devices.length > 1) {
        this.logger.warn(
          `Multiple devices detected: ${devices.join(',')}. Using the first: ${devices[0]}`,
        );
      }
      return devices[0];
    } catch (error) {
      this.logger.error('Failed to get devices:', error);
      throw error;
    }
  }

  private async calculateScreenContext(adb: ADB) {
    const screenSize = await adb.getScreenSize();
    this.logger.debug('getScreenSize', screenSize);
    if (!screenSize) {
      throw new Error('Unable to get screenSize');
    }

    // handle string format "width x height"
    const match = screenSize.match(/(\d+)x(\d+)/);
    if (!match || match.length < 3) {
      throw new Error(`Unable to parse screenSize: ${screenSize}`);
    }
    const width = Number.parseInt(match[1], 10);
    const height = Number.parseInt(match[2], 10);

    // Get device display density
    const densityNum = await adb.getScreenDensity();
    this.logger.debug('getScreenDensity', densityNum);
    // Standard density is 160, calculate the ratio
    const deviceRatio = Number(densityNum) / 160;
    this.logger.debug('deviceRatio', deviceRatio);
    const adjustedSize = this.reverseAdjustCoordinates(deviceRatio, width, height);
    this.logger.debug('adjustedWidth', adjustedSize);

    return {
      screenWidth: width,
      screenHeight: height,
      scaleX: 1,
      scaleY: 1,
    };
  }

  private reverseAdjustCoordinates(ratio: number, x: number, y: number): { x: number; y: number } {
    return {
      x: Math.round(x / ratio),
      y: Math.round(y / ratio),
    };
  }

  async screenshotWithFallback(): Promise<ScreenshotOutput> {
    let screenshotBuffer;
    try {
      screenshotBuffer = await this._adb!.takeScreenshot(null);
    } catch (error) {
      this.logger.warn('screenshotWithFallback', (error as Error).message);
      // TODO: does the appium supports exec-out?
      try {
        const result = await this._adb!.shell(`screencap -p ${screenshotPathOnAndroid}`);
        this.logger.debug('screenshotWithFallback result of screencap:', result);
      } catch (error) {
        // screenshot which is forbidden by app
        await this.executeWithYadb(`-screenshot ${screenshotPathOnAndroid}`);
      }
      await this._adb!.pull(screenshotPathOnAndroid, screenshotPathOnLocal);
      screenshotBuffer = await fs.promises.readFile(screenshotPathOnLocal);
    }
    const base64 = screenshotBuffer.toString('base64');
    return {
      status: 'success',
      base64,
    };
  }

  private async handleClick(x: number, y: number): Promise<void> {
    // Use adjusted coordinates
    await this._adb!.shell(`input tap ${x} ${y}`);
  }

  private async handleType(text: string): Promise<void> {
    if (!text) {
      throw new Error('The content of type is empty');
    }

    const isChinese = /[\p{Script=Han}\p{sc=Hani}]/u.test(text);
    // for pure ASCII characters, directly use inputText
    if (!isChinese) {
      await this._adb!.inputText(text);
      return;
    }
    // for non-ASCII characters, use yadb
    await this.executeWithYadb(`-keyboard "${text}"`);
  }

  private async handleHotkey(keyStr: string) {
    if (!keyStr) {
      throw new Error('The hotkey is empty');
    }
    const keyMap: Record<string, number> = {
      home: 3, // KEYCODE_HOME, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_HOME
      back: 4, // KEYCODE_BACK, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_BACK
      menu: 82, // KEYCODE_MENU, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_MENU
      power: 26, // KEYCODE_POWER, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_POWER
      volume_up: 24, // KEYCODE_VOLUME_UP, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_VOLUME_UP
      volumeup: 24,
      volume_down: 25, // KEYCODE_VOLUME_DOWN, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_VOLUME_DOWN
      volumedown: 25,
      mute: 164, // KEYCODE_VOLUME_MUTE, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_VOLUME_MUTE
      enter: 66, // KEYCODE_ENTER, https://developer.android.com/reference/android/view/KeyEvent#KEYCODE_ENTER
      delete: 112,
      lock: 26,
      // tab: 61,
      // arrowup: 19,
      // arrow_up: 19,
      // arrowdown: 20,
      // arrow_down: 20,
      // arrowleft: 21,
      // arrow_left: 21,
      // arrowright: 22,
      // arrowr_ight: 22,
      // escape: 111,
      // end: 123,
    };
    const keyCode = keyMap[keyStr.toLowerCase()];
    if (!keyCode) {
      throw new Error(`Unsupported key: ${keyStr}`);
    }
    this._adb!.keyevent(keyCode);
  }

  private async handleSwipe(
    from: { x: number; y: number },
    to: { x: number; y: number },
    duration: number, // ms
  ): Promise<void> {
    await this._adb!.shell(`input swipe ${from.x} ${from.y} ${to.x} ${to.y} ${duration}`);
  }

  private async handleScroll(direction: string, point?: Coordinates) {
    const screenContext = await this.getScreenContext();
    let startX = screenContext.screenWidth / 2;
    let startY = screenContext.screenHeight / 2;
    if (point) {
      const { realX, realY } = await this.calculateRealCoords(point);
      startX = realX;
      startY = realY;
    }
    let endX = startX;
    let endY = startY;
    switch (direction.toLowerCase()) {
      case 'up':
        endY = endY - 200;
        break;
      case 'down':
        endY = endY + 200;
        break;
      case 'left':
        endX = endX - 200;
        break;
      case 'right':
        endX = endX + 200;
        break;
      default:
        throw new Error(`Unsupported scroll direction: ${direction}`);
    }
    this.handleSwipe({ x: startX, y: startY }, { x: endX, y: endY }, 300);
  }

  /**
   * @param subCommand, such as:
   * -keyboard "${keyboardContent}
   */
  private async executeWithYadb(subCommand: string): Promise<void> {
    if (!this._hasPushedYadb) {
      // the size of yadb just 12kB, just adb push it every time initailied
      const yadbBin = path.join(__dirname, '../bin/yadb');
      await this._adb!.push(yadbBin, '/data/local/tmp');
      this._hasPushedYadb = true;
    }
    await this._adb!.shell(`${yadbCommand} ${subCommand}`);
  }
}
