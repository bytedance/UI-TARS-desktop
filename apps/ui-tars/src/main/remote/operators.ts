/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Key } from '@computer-use/nut-js';
import {
  type ScreenshotOutput,
  type ExecuteParams,
  type ExecuteOutput,
  Operator,
  parseBoxToScreenCoords,
  StatusEnum,
} from '@ui-tars/sdk/core';
import { RemoteBrowserOperator } from '@ui-tars/operator-browser';

import { logger } from '@main/logger';
import { sleep } from '@ui-tars/shared/utils';
import { BaseRemoteComputer } from './shared';
import { ProxyClient, RemoteComputer, SandboxInfo } from './proxyClient';
import { SubsRemoteComputer } from './subscriptionClient';

const INVALID_COORDINATE_ERROR_CODE = 'REMOTE_COORDINATES_INVALID';

const requireStartCoordinates = (
  actionType: string,
  startX: number | null,
  startY: number | null,
): { startX: number; startY: number } => {
  if (
    startX === null ||
    startY === null ||
    !Number.isFinite(startX) ||
    !Number.isFinite(startY)
  ) {
    throw new Error(
      `[${INVALID_COORDINATE_ERROR_CODE}] ${actionType} requires valid coordinates, got (${startX}, ${startY})`,
    );
  }
  return { startX, startY };
};

export class RemoteComputerOperator extends Operator {
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

  private static currentInstance: RemoteComputerOperator | null = null;

  public static async create(): Promise<RemoteComputerOperator> {
    const sandbox = await ProxyClient.getSandboxInfo();
    if (!sandbox || !sandbox.sandBoxId) {
      throw new Error('There is no available sandbox');
    }

    logger.info('[RemoteComputerOperator] create', sandbox.sandBoxId);
    this.currentInstance = new RemoteComputerOperator('free', sandbox, null);
    return this.currentInstance;
  }

  public static async createSubscription(
    sandboxEip: string,
  ): Promise<RemoteComputerOperator> {
    this.currentInstance = new RemoteComputerOperator(
      'subscription',
      null,
      sandboxEip,
    );
    return this.currentInstance;
  }

  private remoteComputer: BaseRemoteComputer;

  private constructor(
    mode: 'free' | 'subscription',
    sandboxInfo: SandboxInfo | null,
    sandboxEip: string | null,
  ) {
    super();
    if (mode === 'free' && sandboxInfo) {
      this.remoteComputer = new RemoteComputer(sandboxInfo.sandBoxId);
      return;
    }
    if (mode === 'subscription' && sandboxEip) {
      this.remoteComputer = new SubsRemoteComputer(sandboxEip);
      return;
    }
    throw new Error('Invalid mode or parameters');
  }

  public async screenshot(): Promise<ScreenshotOutput> {
    const { width: physicalWidth, height: physicalHeight } =
      await this.remoteComputer.getScreenSize();

    logger.info(
      '[screenshot] [primaryDisplay]',
      'physicalWidth:',
      physicalWidth,
      'physicalHeight:',
      physicalHeight,
    );

    const base64 = await this.remoteComputer.takeScreenshot();

    return {
      base64: base64,
      scaleFactor: 1,
    };
  }

  async execute(params: ExecuteParams): Promise<ExecuteOutput> {
    const { parsedPrediction, screenWidth, screenHeight, scaleFactor } = params;

    const { action_type, action_inputs } = parsedPrediction;
    const startBoxStr = action_inputs?.start_box || '';

    logger.info('[RemoteComputerOperator] execute', scaleFactor);
    const { x: rawX, y: rawY } = parseBoxToScreenCoords({
      boxStr: startBoxStr,
      screenWidth,
      screenHeight,
    });

    const startX = rawX !== null ? Math.round(rawX) : null;
    const startY = rawY !== null ? Math.round(rawY) : null;

    logger.info(`[RemoteComputerOperator Position]: (${startX}, ${startY})`);

    const getHotkeys = (keyStr: string | undefined): Key[] => {
      if (keyStr) {
        const platformCommandKey =
          process.platform === 'darwin' ? Key.LeftCmd : Key.LeftWin;
        const platformCtrlKey =
          process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl;
        const keyMap: Record<string, Key> = {
          return: Key.Enter,
          enter: Key.Enter,
          backspace: Key.Backspace,
          delete: Key.Delete,
          ctrl: platformCtrlKey,
          shift: Key.LeftShift,
          alt: Key.LeftAlt,
          space: Key.Space,
          'page down': Key.PageDown,
          pagedown: Key.PageDown,
          'page up': Key.PageUp,
          pageup: Key.PageUp,
          meta: platformCommandKey,
          win: platformCommandKey,
          command: platformCommandKey,
          cmd: platformCommandKey,
          comma: Key.Comma,
          ',': Key.Comma,
          up: Key.Up,
          down: Key.Down,
          left: Key.Left,
          right: Key.Right,
          arrowup: Key.Up,
          arrowdown: Key.Down,
          arrowleft: Key.Left,
          arrowright: Key.Right,
        };

        const keys = keyStr
          .split(/[\s+]/)
          .map(
            (k) =>
              keyMap[k.toLowerCase()] ||
              Key[k.toUpperCase() as keyof typeof Key],
          );
        logger.info('[RemoteComputerOperator] hotkey: ', keys);
        return keys;
      } else {
        logger.error(
          '[RemoteComputerOperator] hotkey error: ',
          `${keyStr} is not a valid key`,
        );
        return [];
      }
    };

    switch (action_type) {
      case 'wait':
        logger.info('[RemoteComputerOperator] wait', action_inputs);
        await sleep(5000);
        break;

      case 'mouse_move':
      case 'hover':
        logger.info('[RemoteComputerOperator] mouse_move');
        const mouseMoveCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );
        await this.remoteComputer.moveMouse(
          mouseMoveCoords.startX,
          mouseMoveCoords.startY,
        );
        break;

      case 'click':
      case 'left_click':
      case 'left_single':
        logger.info('[RemoteComputerOperator] left_click');
        const leftClickCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );
        await this.remoteComputer.clickMouse(
          leftClickCoords.startX,
          leftClickCoords.startY,
          'Left',
          true,
          true,
        );
        break;

      case 'left_double':
      case 'double_click':
        logger.info(
          `[RemoteComputerOperator] ${action_type}(${startX}, ${startY})`,
        );
        const doubleClickCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );
        await this.remoteComputer.clickMouse(
          doubleClickCoords.startX,
          doubleClickCoords.startY,
          'DoubleLeft',
          true,
          true,
        );
        break;

      case 'right_click':
      case 'right_single':
        logger.info('[RemoteComputerOperator] right_click');
        const rightClickCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );
        await this.remoteComputer.clickMouse(
          rightClickCoords.startX,
          rightClickCoords.startY,
          'Right',
          true,
          true,
        );
        break;

      case 'middle_click':
        logger.info('[RemoteComputerOperator] middle_click');
        const middleClickCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );
        await this.remoteComputer.clickMouse(
          middleClickCoords.startX,
          middleClickCoords.startY,
          'Middle',
          true,
          true,
        );
        break;

      case 'left_click_drag':
      case 'drag':
      case 'select': {
        logger.info('[RemoteComputerOperator] drag', action_inputs);
        const dragStartCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );

        if (!action_inputs?.end_box) {
          throw new Error(
            `[${INVALID_COORDINATE_ERROR_CODE}] ${action_type} requires valid end coordinates, got (null, null)`,
          );
        }

        const { x: rawEndX, y: rawEndY } = parseBoxToScreenCoords({
          boxStr: action_inputs.end_box,
          screenWidth,
          screenHeight,
        });
        const endX = rawEndX !== null ? Math.round(rawEndX) : null;
        const endY = rawEndY !== null ? Math.round(rawEndY) : null;

        if (
          endX === null ||
          endY === null ||
          !Number.isFinite(endX) ||
          !Number.isFinite(endY)
        ) {
          logger.error(
            '[RemoteComputerOperator] drag end coords error: ',
            `endX or endY is null: (${endX}, ${endY})`,
          );
          throw new Error(
            `[${INVALID_COORDINATE_ERROR_CODE}] ${action_type} requires valid end coordinates, got (${endX}, ${endY})`,
          );
        }

        await this.remoteComputer.dragMouse(
          dragStartCoords.startX,
          dragStartCoords.startY,
          endX,
          endY,
        );
        break;
      }

      case 'type': {
        const content = action_inputs.content?.trim();
        logger.info('[RemoteComputerOperator] type', content);
        if (content) {
          const stripContent = content.replace(/\\n$/, '').replace(/\n$/, '');
          await this.remoteComputer.typeText(stripContent);
        }
        break;
      }

      case 'hotkey':
      case 'press': {
        const keyStr = action_inputs?.key || action_inputs?.hotkey;
        logger.info('[RemoteComputerOperator] hotkey', keyStr);
        const keys = getHotkeys(keyStr);
        if (keys.length > 0 && keyStr) {
          await this.remoteComputer.pressKey(keyStr);
        }
        break;
      }

      case 'scroll': {
        const { direction } = action_inputs;
        const scrollStartCoords = requireStartCoordinates(
          action_type,
          startX,
          startY,
        );

        const directionMap: Record<string, 'Up' | 'Down' | 'Left' | 'Right'> = {
          up: 'Up',
          down: 'Down',
          left: 'Left',
          right: 'Right',
        };
        const normalizedDirection = direction?.toLowerCase() || '';
        const mappedDirection = directionMap[normalizedDirection];

        if (mappedDirection) {
          await this.remoteComputer.scroll(
            scrollStartCoords.startX,
            scrollStartCoords.startY,
            mappedDirection,
            5 * 100,
          );
        } else {
          logger.warn(
            `[RemoteComputerOperator] 不支持的滚动方向: ${direction}`,
          );
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

export const createRemoteBrowserOperator = async () => {
  const cdpUrl = await ProxyClient.getBrowserCDPUrl();
  if (!cdpUrl) {
    throw new Error('There is no available browser');
  }
  const operator = await RemoteBrowserOperator.getInstance(cdpUrl);
  return operator;
};
