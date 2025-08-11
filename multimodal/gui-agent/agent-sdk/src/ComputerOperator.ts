/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Operator,
  useContext,
  parseBoxToScreenCoords,
  StatusEnum,
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
} from '@ui-tars/sdk/core';
import { Jimp } from 'jimp';
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

const moveStraightTo = async (startX: number | null, startY: number | null) => {
  if (startX === null || startY === null) {
    return;
  }
  await mouse.move(straightTo(new Point(startX, startY)));
};
export class ComputerOperator extends Operator {
  static MANUAL = {
    ACTION_SPACES: [
      `click(start_box='[x1, y1, x2, y2]')`,
      `left_double(start_box='[x1, y1, x2, y2]')`,
      `right_single(start_box='[x1, y1, x2, y2]')`,
      `drag(start_box='[x1, y1, x2, y2]', end_box='[x3, y3, x4, y4]')`,
      `hotkey(key='')`, // secretlint-disable-line
      `type(content='') #If you want to submit your input, use "\\n" at the end of \`content\`.`,
      `scroll(start_box='[x1, y1, x2, y2]', direction='down or up or right or left')`,
      `wait() #Sleep for 5s and take a screenshot to check for any changes.`,
      `finished()`,
      `call_user() # Submit the task and call the user when the task is unsolvable, or when you need the user's help.`,
    ],
  };

  public async screenshot(): Promise<ScreenshotOutput> {
    const { logger } = useContext();
    const grabImage = await screen.grab();
    const screenWithScale = await grabImage.toRGB(); // widthScale = screenWidth * scaleX

    const scaleFactor = screenWithScale.pixelDensity.scaleX;

    logger.info(
      '[NutjsOperator]',
      'scaleX',
      screenWithScale.pixelDensity.scaleX,
      'scaleY',
      screenWithScale.pixelDensity.scaleY,
    );

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

    const output = {
      base64: physicalScreenImage.toString('base64'),
      scaleFactor,
    };

    logger?.info(`[NutjsOperator] screenshot: ${width}x${height}, scaleFactor: ${scaleFactor}`);
    return output;
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { logger } = useContext();
    const { parsedPrediction, screenWidth, screenHeight, scaleFactor } = params;

    const { action_type, action_inputs } = parsedPrediction;
    const startBoxStr = action_inputs?.start_box || '';

    logger.info('[NutjsOperator] execute', scaleFactor);
    const { x: startX, y: startY } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    logger.info(`[NutjsOperator Position]: (${startX}, ${startY})`);

    // execute configs
    mouse.config.mouseSpeed = 3600;

    // if (startBoxStr) {
    //   const region = await nutScreen.highlight(
    //     new Region(startX, startY, 100, 100),
    //   );
    //   logger.info('[execute] [Region]', region);
    // }

    const getHotkeys = (keyStr: string | undefined): Key[] => {
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
        logger.info('[NutjsOperator] hotkey: ', keys);
        return keys;
      } else {
        logger.error('[NutjsOperator] hotkey error: ', `${keyStr} is not a valid key`);
        return [];
      }
    };

    switch (action_type) {
      case 'wait':
        logger.info('[NutjsOperator] wait', action_inputs);
        await sleep(5000);
        break;

      case 'mouse_move':
      case 'hover':
        logger.info('[NutjsOperator] mouse_move');
        await moveStraightTo(startX, startY);
        break;

      case 'click':
      case 'left_click':
      case 'left_single':
        logger.info('[NutjsOperator] left_click');
        await moveStraightTo(startX, startY);
        await sleep(100);
        await mouse.click(Button.LEFT);
        break;

      case 'left_double':
      case 'double_click':
        logger.info(`[NutjsOperator] ${action_type}(${startX}, ${startY})`);
        await moveStraightTo(startX, startY);
        await sleep(100);
        await mouse.doubleClick(Button.LEFT);
        break;

      case 'right_click':
      case 'right_single':
        logger.info('[NutjsOperator] right_click');
        await moveStraightTo(startX, startY);
        await sleep(100);
        await mouse.click(Button.RIGHT);
        break;

      case 'middle_click':
        logger.info('[NutjsOperator] middle_click');
        await moveStraightTo(startX, startY);
        await mouse.click(Button.MIDDLE);
        break;

      case 'left_click_drag':
      case 'drag':
      case 'select': {
        // end_box
        if (action_inputs?.end_box) {
          const { x: endX, y: endY } = parseBoxToScreenCoords({
            boxStr: action_inputs.end_box,
            screenWidth,
            screenHeight,
          });

          if (startX && startY && endX && endY) {
            logger.info(
              `[NutjsOperator] drag coordinates: startX=${startX}, startY=${startY}, endX=${endX}, endY=${endY}`,
            );
            // 先移动鼠标到 startX, startY 位置
            await moveStraightTo(startX, startY);
            await sleep(100);
            await mouse.drag(straightTo(new Point(endX, endY)));
          }
        }
        break;
      }

      case 'type': {
        const content = action_inputs.content?.trim();
        logger.info('[NutjsOperator] type', content);
        if (content) {
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
        }
        break;
      }

      case 'hotkey': {
        const keyStr = action_inputs?.key || action_inputs?.hotkey;
        const keys = getHotkeys(keyStr);
        if (keys.length > 0) {
          await keyboard.pressKey(...keys);
          await keyboard.releaseKey(...keys);
        }
        break;
      }

      case 'press': {
        const keyStr = action_inputs?.key || action_inputs?.hotkey;
        const keys = getHotkeys(keyStr);
        if (keys.length > 0) {
          await keyboard.pressKey(...keys);
        }
        break;
      }

      case 'release': {
        const keyStr = action_inputs?.key || action_inputs?.hotkey;
        const keys = getHotkeys(keyStr);
        if (keys.length > 0) {
          await keyboard.releaseKey(...keys);
        }
        break;
      }

      case 'scroll': {
        const { direction } = action_inputs;
        // if startX and startY is not null, move mouse to startX, startY
        if (startX !== null && startY !== null) {
          await moveStraightTo(startX, startY);
        }

        switch (direction?.toLowerCase()) {
          case 'up':
            await mouse.scrollUp(5 * 100);
            break;
          case 'down':
            await mouse.scrollDown(5 * 100);
            break;
          default:
            console.warn(`[NutjsOperator] Unsupported scroll direction: ${direction}`);
        }
        break;
      }

      case 'error_env':
      case 'call_user':
      case 'finished':
      case 'user_stop':
        return { status: StatusEnum.END };

      default:
        logger.warn(`Unsupported action: ${action_type}`);
    }
  }
}
