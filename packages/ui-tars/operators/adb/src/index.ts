/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Operator,
  useContext,
  parseBoxToScreenCoords,
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
  StatusEnum,
} from '@ui-tars/sdk/core';
import { command } from 'execa';
import inquirer from 'inquirer';
import { readFileSync } from 'fs';

function commandWithTimeout(cmd: string, timeout = 3000) {
  return command(cmd, { timeout });
}

// Get android device
export async function getAndroidDeviceId() {
  const getDevices = await commandWithTimeout('adb devices').catch(() => ({
    stdout: '',
  }));

  const devices = getDevices.stdout
    .split('\n')
    .map((value, index) => {
      // Filter first line description
      if (index === 0) {
        return false;
      }

      return value.split('\t')?.[0].trim();
    })
    .filter(Boolean);

  if (devices.length === 0) {
    return null;
  }

  return devices.length > 1
    ? (
        await inquirer.prompt([
          {
            type: 'list',
            name: 'device',
            message:
              'There are more than one devices here, please choose which device to use for debugging',
            choices: devices,
            default: devices[0],
          },
        ])
      ).device
    : devices[0];
}

export class AdbOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `type(content='')`,
      `swipe(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left') # You must spesify the start_box`,
      `hotkey(key='') # The available keys: enter,back,home,backspace,delete,menu,power,volume_up,volume_down,mute,lock`,
      `wait() #Sleep for 2s and take a screenshot to check for any changes.`,
      `press_home() # Press the home key`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  private deviceId: string | null = null;
  private androidDevUseAdbIME: boolean | null = null;
  private currentRound = 0;

  constructor(deviceId: string) {
    super();
    this.deviceId = deviceId;
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    const { logger } = useContext();
    this.currentRound++;
    try {
      // Get screenshot
      const screencap2 = await command(
        `adb -s ${this.deviceId} exec-out screencap -p`,
        {
          encoding: null,
          timeout: 5000,
        },
      ).catch(() => ({
        stdout: '',
      }));

      const base64 = screencap2.stdout.toString('base64');

      return {
        base64,
        scaleFactor: 1,
      };
    } catch (error) {
      logger.error('[AdbOperator] Screenshot error:', error);
      throw error;
    }
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { logger } = useContext();
    const { parsedPrediction, screenWidth, screenHeight } = params;
    const { action_type, action_inputs } = parsedPrediction;
    const startBoxStr = action_inputs?.start_box || '';

    const { x: startX, y: startY } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    try {
      switch (action_type) {
        case 'click':
          if (startX !== null && startY !== null) {
            await commandWithTimeout(
              `adb -s ${this.deviceId} shell input tap ${Math.round(startX)} ${Math.round(startY)}`,
            );
          }
          break;
        case 'type':
          if (this.androidDevUseAdbIME === null) {
            const imeCheck = await commandWithTimeout(
              `adb -s ${this.deviceId} shell settings get secure default_input_method`,
            ).catch(() => ({
              stdout: '',
            }));
            this.androidDevUseAdbIME =
              imeCheck.stdout.includes('com.android.adbkeyboard/.AdbIME') ||
              false;
          }
          const content = action_inputs.content?.trim();
          const isChinese = (content || '').split('').some((char) => {
            const code = char.charCodeAt(0);
            return code >= 0x4e00 && code <= 0x9fff;
          });
          if (isChinese && !this.androidDevUseAdbIME) {
            const imeSet = await commandWithTimeout(
              `adb -s ${this.deviceId} shell ime set com.android.adbkeyboard/.AdbIME`,
            ).catch((error) => {
              return { stdout: '', stderr: error.shortMessage };
            });

            if (
              imeSet.stdout === '' &&
              imeSet.stderr.includes('cannot be selected')
            ) {
              logger.error(
                '[AdbOperator] The AdbIME is unavaliable, please install and active it on your Android device and retry if you want UI-TARS use Chniese.',
              );
              return { status: StatusEnum.ERROR } as ExecuteOutput;
            } else if (
              imeSet.stdout.includes(
                'Input method com.android.adbkeyboard/.AdbIME selected for user',
              )
            ) {
              this.androidDevUseAdbIME = true;
            }
          }
          if (content) {
            // Use text command to input text, need to handle special characters
            const escapedContent = content.replace(/(['"\\])/g, '\\$1');
            const cmd = this.androidDevUseAdbIME
              ? `adb -s ${this.deviceId} shell am broadcast -a ADB_INPUT_TEXT --es msg "${escapedContent}"`
              : `adb -s ${this.deviceId} shell input text "${escapedContent}"`;
            await commandWithTimeout(cmd);
          }
          break;
        case 'swipe':
        case 'drag':
          const { end_box } = action_inputs;
          if (end_box) {
            const { x: endX, y: endY } = parseBoxToScreenCoords({
              boxStr: end_box,
              screenWidth,
              screenHeight,
            });
            if (
              startX !== null &&
              startY !== null &&
              endX !== null &&
              endY !== null
            ) {
              await commandWithTimeout(
                `adb -s ${this.deviceId} shell input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} 300`,
              );
            }
          }
          break;
        case 'scroll':
          const { direction } = action_inputs;
          if (startX == null || startY == null) {
            throw Error('The start_box is required for scroll action.');
          }
          let endX = startX,
            endY = startY;
          switch (direction) {
            case 'up':
              endX = startX;
              endY = startY - 100; // Scroll up, decrease Y coordinate
              break;
            case 'down':
              endX = startX;
              endY = startY + 100; // Scroll down, increase Y coordinate
              break;
            case 'left':
              endX = startX - 100; // Scroll left, decrease X coordinate
              endY = startY;
              break;
            case 'right':
              endX = startX + 100; // Scroll right, increase X coordinate
              endY = startY;
              break;
          }
          await commandWithTimeout(
            `adb -s ${this.deviceId} shell input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} 300`,
          );
          break;
        case 'press_home':
          await commandWithTimeout(
            `adb -s ${this.deviceId} shell input keyevent KEYCODE_HOME`,
          );
          break;
        case 'hotkey':
          const { key } = action_inputs;
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
          break;
        case 'wait':
          await new Promise((resolve) => setTimeout(resolve, 2000));
          break;
        default:
          logger.warn(`[AdbOperator] Unsupported action: ${action_type}`);
          break;
      }
    } catch (error) {
      logger.error('[AdbOperator] Error:', error);
      throw error;
    }
  }
}
