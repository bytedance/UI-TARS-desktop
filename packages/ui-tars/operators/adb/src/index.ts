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
import { ADB } from 'appium-adb';
import { existsSync } from 'fs';

function commandWithTimeout(cmd: string, timeout = 3000) {
  return command(cmd, { timeout });
}

async function findAdbPath(): Promise<string | null> {
  try {
    const adbpath = await commandWithTimeout('which adb').catch(() => ({
      stdout: '',
    }));

    if (existsSync(adbpath.stdout)) {
      const sdkPath = adbpath.stdout.replace(/\/platform-tools\/.*$/, '');
      return sdkPath;
    }
  } catch (e) {
    // which command failed
    console.error('Failed to find adb path:', e);
  }

  return null;
}

// Get android device
export async function getAndroidDeviceId() {
  // 检查环境变量
  const androidHome = process.env.ANDROID_HOME;
  const androidSdkRoot = process.env.ANDROID_SDK_ROOT;

  if (!androidHome && !androidSdkRoot) {
    const sdkPath = await findAdbPath();
    if (sdkPath) {
      process.env.ANDROID_HOME = sdkPath;
      process.env.ANDROID_SDK_ROOT = sdkPath;
    } else {
      console.error(`Error: ADB tool not found. Please follow these steps to install:
        
        1. Install Android Studio:
           Visit https://developer.android.com/studio to download and install
        
        2. Or directly install Android SDK Platform-Tools:
           Visit https://developer.android.com/studio/releases/platform-tools
        
        3. After installation, make sure to add the following environment variables to your shell configuration file (.zshrc or .bash_profile):
        
           export ANDROID_HOME=/path/to/your/Android/sdk
           export PATH=$PATH:$ANDROID_HOME/platform-tools
        
        4. Restart terminal and try again
        
        If you have already installed Android Studio, please ensure:
        - Open Android Studio
        - Go to Preferences > Appearance & Behavior > System Settings > Android SDK
        - Note down the Android SDK Location path
        - Set this path as the ANDROID_HOME environment variable`);
      process.exit(1);
    }
  }

  const adb = await ADB.createADB();
  try {
    const devices = await adb.getConnectedDevices();
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
              choices: devices.map((device) => device.udid),
              default: devices[0].udid,
            },
          ])
        ).device
      : devices[0].udid;
  } catch (error) {
    console.error('Failed to get Android devices:', error);
    return null;
  }
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

  static KEY_CODE_MAP: Record<string, number> = {
    enter: 66, // KEYCODE_ENTER
    back: 4, // KEYCODE_BACK
    home: 3, // KEYCODE_HOME
    backspace: 67, // KEYCODE_DEL
    delete: 112, // KEYCODE_FORWARD_DEL
    menu: 82, // KEYCODE_MENU
    power: 26, // KEYCODE_POWER
    volume_up: 24, // KEYCODE_VOLUME_UP
    volume_down: 25, // KEYCODE_VOLUME_DOWN
    mute: 164, // KEYCODE_VOLUME_MUTE
    lock: 26, // KEYCODE_POWER
  };

  private deviceId: string | undefined;
  private androidDevUseAdbIME: boolean | null = null;
  private currentRound = 0;
  private adb: ADB | null = null;

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
    const adb = await this.getAdb();

    const { x: startX, y: startY } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    try {
      switch (action_type) {
        case 'click':
          if (startX !== null && startY !== null) {
            await adb.shell(
              `input tap ${Math.round(startX)} ${Math.round(startY)}`,
            );
          }
          break;
        case 'type':
          if (this.androidDevUseAdbIME === null) {
            const imeCheck = await adb.shell(
              `settings get secure default_input_method`,
            );
            this.androidDevUseAdbIME = imeCheck.includes(
              'com.android.adbkeyboard/.AdbIME',
            );
          }
          const content = action_inputs.content?.trim();
          const isChinese = (content || '').split('').some((char) => {
            const code = char.charCodeAt(0);
            return code >= 0x4e00 && code <= 0x9fff;
          });
          if (isChinese && !this.androidDevUseAdbIME) {
            const imeSet = await adb.shell(
              `ime set com.android.adbkeyboard/.AdbIME`,
            );

            logger.info(`[AdbOperator] imeSet: ${imeSet}`);

            if (imeSet === '' && imeSet.includes('cannot be selected')) {
              logger.error(
                '[AdbOperator] The AdbIME is unavaliable, please install and active it on your Android device and retry if you want UI-TARS use Chniese.',
              );
              return { status: StatusEnum.ERROR } as ExecuteOutput;
            } else if (
              imeSet.includes(
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
              ? `am broadcast -a ADB_INPUT_TEXT --es msg "${escapedContent}"`
              : `input text "${escapedContent}"`;
            await adb.shell(cmd);
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
              await adb.shell(
                `input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} 300`,
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
          await adb.shell(
            `input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} 300`,
          );
          break;
        case 'press_home':
          await adb.keyevent(3); // KEYCODE_HOME
          break;
        case 'hotkey':
          const { key } = action_inputs;
          const keyCode = AdbOperator.KEY_CODE_MAP[key || ''];
          if (keyCode) {
            await adb.keyevent(keyCode);
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

  private async getAdb() {
    if (!this.adb) {
      this.adb = await ADB.createADB({
        udid: this.deviceId,
      });
    }
    return this.adb;
  }
}
