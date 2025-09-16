/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
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

export class AdbOperator extends Operator {
  private logger: ConsoleLogger;
  private _deviceId: string | null = null;
  private _adb: ADB | null = null;
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
    throw new Error('Method not implemented.');
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
    const screenshotBuffer = await this._adb.takeScreenshot(null);
    // TODO: Add exception hanlder
    const base64 = screenshotBuffer.toString('base64');
    return {
      status: 'success',
      base64,
    };
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
      case 'long_press':
        break;
      case 'type':
        break;
      case 'swipe':
      case 'drag':
        break;
      case 'scroll':
        break;
      case 'hotkey':
        await this.handleHotkey(action as HotkeyAction);
        break;
      case 'open_app':
        break;
      case 'home':
      case 'press_home':
        break;
      case 'back':
      case 'press_back':
        break;
      default:
        this.logger.warn(`[AdbOperator] Unsupported action: ${actionType}`);
        throw new Error(`Unsupported action: ${actionType}`);
    }
  }

  private async calculateRealCoords(
    coords: Coordinates,
  ): Promise<{ realX: number; realY: number }> {
    throw new Error('Method not implemented.');
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
      throw new Error('Unable to get screen size');
    }

    // handle string format "width x height"
    const match = screenSize.match(/(\d+)x(\d+)/);
    if (!match || match.length < 3) {
      throw new Error(`Unable to parse screen size: ${screenSize}`);
    }
    const width = Number.parseInt(match[1], 10);
    const height = Number.parseInt(match[2], 10);

    // Get device display density
    const densityNum = await adb.getScreenDensity();
    this.logger.debug('getScreenDensity', densityNum);
    // Standard density is 160, calculate the ratio
    const deviceRatio = Number(densityNum) / 160;
    this.logger.debug('deviceRatio', deviceRatio);

    const { x: adjustedWidth, y: adjustedHeight } = this.reverseAdjustCoordinates(
      deviceRatio,
      width,
      height,
    );

    return {
      screenWidth: adjustedWidth,
      screenHeight: adjustedHeight,
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

  private async handleClick(x: number, y: number): Promise<void> {
    // Use adjusted coordinates
    await this._adb!.shell(`input tap ${x} ${y}`);
  }

  private async handleHotkey(action: HotkeyAction) {
    /*
    const { inputs } = action;
    const { key } = inputs;
    switch (key) {
      case 'enter': // Enter key
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_ENTER`,
        );
        break;
      case 'back': // Back key
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_BACK`,
        );
        break;
      case 'home': // Return to home screen
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_HOME`,
        );
        break;
      case 'backspace': // Backspace key
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent 67`,
        );
        break;
      case 'delete': // Delete key
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent 112`,
        );
        break;
      case 'menu': // Open menu (less commonly used)
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_MENU`,
        );
        break;
      case 'power': // Power key (lock/unlock screen)
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_POWER`,
        );
        break;
      case 'volume_up': // Increase volume
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_VOLUME_UP`,
        );
        break;
      case 'volume_down': // Decrease volume
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_VOLUME_DOWN`,
        );
        break;
      case 'mute': // Mute
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent KEYCODE_VOLUME_MUTE`,
        );
        break;
      case 'lock': // Lock screen
        await commandWithTimeout(
          `adb -s ${this.deviceId} shell input keyevent 26`,
        );
        break;
    }
  */
  }
}
