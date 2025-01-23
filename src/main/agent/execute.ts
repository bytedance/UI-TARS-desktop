/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Button,
  Key,
  Point,
  keyboard,
  mouse,
  sleep,
  straightTo,
} from '@computer-use/nut-js';
import { clipboard } from 'electron';

import { PredictionParsed } from '@ui-tars/shared/types';

import * as env from '../env';
import { parseBoxToScreenCoords } from '../utils/coords';

const moveStraightTo = async (startX: number | null, startY: number | null) => {
  if (startX === null || startY === null) {
    return;
  }
  await mouse.move(straightTo(new Point(startX, startY)));
};

export interface ExecuteParams {
  scaleFactor?: number;
  prediction: PredictionParsed;
  screenWidth: number;
  screenHeight: number;
  logger?: any;
}

export const execute = async (executeParams: ExecuteParams) => {
  const {
    prediction,
    screenWidth,
    screenHeight,
    logger = console,
    scaleFactor = 1,
  } = executeParams;

  logger.info(
    '[execute] executeParams',
    JSON.stringify({
      scaleFactor,
      prediction,
      screenWidth,
      screenHeight,
    }),
  );

  const { action_type, action_inputs } = prediction;

  const startBoxStr = action_inputs?.start_box || '';

  logger.info('[execute] action_type', action_type, 'startBoxStr', startBoxStr);

  const { x, y } = startBoxStr
    ? parseBoxToScreenCoords(startBoxStr, screenWidth, screenHeight)
    : { x: null, y: null };

  const startX = x ? x * scaleFactor : null;
  const startY = y ? y * scaleFactor : null;

  logger.info(`[execute] [Position] (${x}, ${y}) => (${startX}, ${startY})`);

  // execute configs
  mouse.config.mouseSpeed = 1500;

  // if (startBoxStr) {
  //   const region = await nutScreen.highlight(
  //     new Region(startX, startY, 100, 100),
  //   );
  //   logger.info('[execute] [Region]', region);
  // }

  switch (action_type) {
    case 'wait':
      logger.info('[device] wait', action_inputs);
      await sleep(1000);
      break;

    case 'mouse_move':
    case 'hover':
      logger.info('[device] mouse_move');
      await moveStraightTo(startX, startY);
      break;

    case 'click':
    case 'left_click':
    case 'left_single':
      logger.info('[device] left_click');
      await moveStraightTo(startX, startY);
      await sleep(100);
      await mouse.click(Button.LEFT);
      break;

    case 'left_double':
    case 'double_click':
      logger.info(`[device] ${action_type}(${startX}, ${startY})`);
      await moveStraightTo(startX, startY);
      await sleep(100);
      await mouse.doubleClick(Button.LEFT);
      break;

    case 'right_click':
    case 'right_single':
      logger.info('[device] right_click');
      await moveStraightTo(startX, startY);
      await sleep(100);
      await mouse.click(Button.RIGHT);
      break;

    case 'middle_click':
      logger.info('[device] middle_click');
      await moveStraightTo(startX, startY);
      await mouse.click(Button.MIDDLE);
      break;

    case 'left_click_drag':
    case 'drag':
    case 'select': {
      logger.info('[device] drag', action_inputs);
      // end_box
      if (action_inputs?.end_box) {
        const { x: endX, y: endY } = parseBoxToScreenCoords(
          action_inputs.end_box,
          screenWidth,
          screenHeight,
        );

        if (startX && startY && endX && endY) {
          await mouse.drag([new Point(startX, startY), new Point(endX, endY)]);
        }
      }
      break;
    }

    case 'type': {
      const content = action_inputs.content?.trim();
      logger.info('[device] type', content);
      if (content) {
        const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
        keyboard.config.autoDelayMs = 0;
        if (env.isWindows) {
          const originalClipboard = clipboard.readText();
          clipboard.writeText(stripContent);
          await keyboard.pressKey(Key.LeftControl, Key.V);
          await keyboard.releaseKey(Key.LeftControl, Key.V);
          await sleep(500);
          clipboard.writeText(originalClipboard);
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
      if (keyStr) {
        const keyMap: Record<string, Key> = {
          return: Key.Enter,
          enter: Key.Enter,
          ctrl: Key.LeftControl,
          shift: Key.LeftShift,
          alt: Key.LeftAlt,
          space: Key.Space,
          'page down': Key.PageDown,
          pagedown: Key.PageDown,
          'page up': Key.PageUp,
          pageup: Key.PageUp,
        };

        const keys = keyStr
          .split(/[\s+]/)
          .map((k) => keyMap[k.toLowerCase()] || Key[k as keyof typeof Key]);
        logger.info('[hotkey]: ', keys);
        await keyboard.pressKey(...keys);
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
          console.warn(`Unsupported scroll direction: ${direction}`);
      }
      break;
    }

    case 'screenshot':
    case 'finished':
      break;

    default:
      logger.warn(`Unsupported action: ${action_type}`);
  }
};
