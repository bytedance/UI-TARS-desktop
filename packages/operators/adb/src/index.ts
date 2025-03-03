/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Operator,
  useContext,
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
} from '@ui-tars/sdk/core';
import { command } from 'execa';
import inquirer from 'inquirer';
import { parseBoxToScreenCoords } from '@ui-tars/sdk/core';
import { Jimp } from 'jimp';
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
  private deviceId: string | null = null;
  private currentRound = 0;

  constructor(deviceId: string) {
    super();
    this.deviceId = deviceId;
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    const { logger } = useContext();
    this.currentRound++;
    try {
      // 获取屏幕截图
      const screencap = await commandWithTimeout(
        `adb -s ${this.deviceId} shell screencap -p /sdcard/uitars_screenshot.png`,
      ).catch(() => ({
        stdout: '',
      }));
      logger.info('[AdbOperator] screencap', screencap.stdout);

      // 将截图拉取到本地临时目录
      const pullScreenshot = await commandWithTimeout(
        `adb -s ${this.deviceId} pull /sdcard/uitars_screenshot.png ./uitars_screenshot_${this.currentRound}.png`,
      ).catch(() => ({
        stdout: '',
      }));
      logger.info('[AdbOperator] pullScreenshot', pullScreenshot.stdout);

      // 读取图片并获取尺寸
      const image = await Jimp.read(
        `./uitars_screenshot_${this.currentRound}.png`,
      );
      const width = image.bitmap.width;
      const height = image.bitmap.height;

      // 读取文件并转换为 base64
      const imageBuffer = readFileSync('uitars_screenshot.png');
      const base64 = imageBuffer.toString('base64');

      logger.info(
        `[AdbOperator] screenshot: ${width}x${height}, scaleFactor: 1`,
      );

      return {
        base64,
        width,
        height,
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

    logger.info(
      '[AdbOperator] execute',
      parsedPrediction,
      screenWidth,
      screenHeight,
    );

    logger.info(
      '[AdbOperator] execute',
      action_type,
      action_inputs,
      startBoxStr,
    );

    const { x: startX, y: startY } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    logger.info(
      '[AdbOperator] execute',
      action_type,
      startX,
      startY,
      action_inputs,
    );

    // adb -s 59d5392d shell input tap 173 551
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
          const content = action_inputs.content?.trim();
          if (content) {
            // 使用 text 命令输入文本，需要处理特殊字符
            const escapedContent = content.replace(/(['"\\])/g, '\\$1');
            await commandWithTimeout(
              `adb -s ${this.deviceId} shell input text "${escapedContent}"`,
            );
          }
          break;

        case 'swipe':
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
