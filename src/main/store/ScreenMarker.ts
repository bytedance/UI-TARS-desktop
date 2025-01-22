/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow, ipcMain, screen } from 'electron';

import { PredictionParsed } from '@ui-tars/shared/types';
import { Conversation } from '@ui-tars/shared/types/data';

import * as env from '@main/env';
import { logger } from '@main/logger';
import { parseBoxToScreenCoords } from '@main/utils/coords';

import { store } from './create';

class ScreenMarker {
  private static instance: ScreenMarker;
  private currentOverlay: BrowserWindow | null = null;
  private pauseButton: BrowserWindow | null = null; // 新增暂停按钮窗口

  static getInstance(): ScreenMarker {
    if (!ScreenMarker.instance) {
      ScreenMarker.instance = new ScreenMarker();
    }
    return ScreenMarker.instance;
  }

  // 新增：显示暂停按钮
  async showPauseButton() {
    if (this.pauseButton) {
      this.pauseButton.close();
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.size;

    this.pauseButton = new BrowserWindow({
      width: 100,
      height: 40,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      type: 'toolbar',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // 设置按钮位置在屏幕顶部中间
    this.pauseButton.setContentProtection(true);
    this.pauseButton.setPosition(Math.floor(screenWidth / 2 - 50), 0);

    this.pauseButton.loadURL(`data:text/html;charset=UTF-8,
      <html>
        <body style="background: transparent; margin: 0; overflow: hidden;">
          <div id="pauseBtn" style="
            width: 100px;
            height: 40px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 0 0 8px 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
          " onclick="window.electron.stopRun()">
            <span style="
              color: white;
              font-family: Arial, Microsoft YaHei;
              font-size: 14px;
            ">Pause</span>
          </div>
          <script>
            const { ipcRenderer } = require('electron');
            window.electron = {
              stopRun: () => {
                ipcRenderer.send('pause-button-clicked');
              }
            };
          </script>
        </body>
      </html>
    `);

    // 监听来自渲染进程的点击事件
    ipcMain.once('pause-button-clicked', () => {
      store.getState().STOP_RUN();
    });
  }

  // show Screen Marker in screen for prediction
  async showPredictionMarker(
    predictions: PredictionParsed[],
    screenshotContext: NonNullable<Conversation['screenshotContext']>['size'],
  ) {
    // 遍历所有 predictions
    for (const prediction of predictions) {
      logger.info('[showPredictionMarker] prediction', prediction);

      try {
        const { width, height } = screenshotContext;

        // mouse position
        let clickX = 0;
        let clickY = 0;
        if (prediction.action_inputs?.start_box) {
          const coords = parseBoxToScreenCoords(
            prediction.action_inputs?.start_box,
            width,
            height,
          );
          clickX = coords.x;
          clickY = coords.y;
        } else {
          const mousePosition = screen.getCursorScreenPoint();
          clickX = mousePosition.x;
          clickY = mousePosition.y;
        }

        const xPos = Math.floor(clickX);
        const yPos = Math.floor(clickY);
        const positionText = `(${xPos}, ${yPos})`;

        let displayText = '';

        switch (prediction.action_type) {
          case 'click':
          case 'left_click':
          case 'left_single':
            displayText = 'Click' + positionText;
            break;
          case 'left_double':
          case 'double_click':
            displayText = 'DoubleClick' + positionText;
            break;
          case 'right_click':
          case 'right_single':
            displayText = 'RightClick' + positionText;
            break;
          case 'middle_click':
            displayText = 'MiddleClick' + positionText;
            break;
          case 'left_click_drag':
          case 'drag':
          case 'select':
            displayText = 'Drag' + positionText;
            break;
          case 'hover':
          case 'mouse_move':
            displayText = 'Hover' + positionText;
            break;
          case 'type':
            displayText = `Type: ${prediction.action_inputs?.content || ''}`;
            break;
          case 'hotkey':
            displayText = `Hotkey: ${prediction.action_inputs?.key || prediction.action_inputs?.hotkey || ''}`;
            break;
          case 'scroll':
            displayText = `Scroll ${prediction.action_inputs?.direction?.toLowerCase() === 'up' ? 'Up' : 'Down'}`;
            break;
          case 'wait':
            displayText = prediction.action_type;
            break;
          default:
            displayText = prediction.action_type + positionText;
        }

        logger.info(
          '[showPredictionMarker] [Position]',
          displayText,
          xPos,
          yPos,
        );

        this.showTextWithMarker(displayText, xPos, yPos);
      } catch (error) {
        logger.error('[showPredictionMarker] 显示预测标记失败:', error);
      }
    }
  }

  async showTextWithMarker(text: string, x: number, y: number) {
    logger.info('[showTextWithMarker] text', text, 'x', x, 'y', y);
    // 如果存在之前的窗口，先关闭它
    this.closeOverlay();

    this.currentOverlay = new BrowserWindow({
      width: 600,
      height: 150,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      thickFrame: false,
      paintWhenInitiallyHidden: true,
      type: 'panel',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    if (env.isWindows) {
      this.currentOverlay.setAlwaysOnTop(true, 'screen-saver');
    }

    this.currentOverlay.setContentProtection(true);
    this.currentOverlay.setIgnoreMouseEvents(true);

    // 在 Windows 上设置窗口为工具窗口
    // if (process.platform === 'win32') {
    //   this.currentOverlay.setWindowButtonVisibility(false);
    //   const { SetWindowAttributes } = await import('windows-native-registry');
    //   SetWindowAttributes(this.currentOverlay.getNativeWindowHandle(), {
    //     toolWindow: true,
    //   });
    // }

    const CIRCLE_CENTER_X = 75;
    const CIRCLE_CENTER_Y = 75;

    this.currentOverlay.setPosition(x - CIRCLE_CENTER_X, y - CIRCLE_CENTER_Y);

    this.currentOverlay.loadURL(`data:text/html;charset=UTF-8,
    <html>
      <body style="background: transparent; margin: 0;">
        <svg width="600" height="150">
          <circle
            cx="${CIRCLE_CENTER_X}"
            cy="${CIRCLE_CENTER_Y}"
            r="16"
            fill="none"
            stroke="red"
            stroke-width="3"
          />
          <circle
            cx="${CIRCLE_CENTER_X}"
            cy="${CIRCLE_CENTER_Y}"
            r="4"
            fill="red"
          />
          <foreignObject x="120" y="50" width="460" height="100">
            <div xmlns="http://www.w3.org/1999/xhtml" style="
              font-family: Arial, Microsoft YaHei, PingFang SC, -apple-system;
              font-size: 16px;
              color: red;
              font-weight: bold;
              word-wrap: break-word;
              white-space: pre-wrap;
            ">${text}</div>
          </foreignObject>
        </svg>
      </body>
    </html>
    `);
  }

  close() {
    if (this.currentOverlay) {
      this.currentOverlay.close();
      this.currentOverlay = null;
    }
    if (this.pauseButton) {
      this.pauseButton.close();
      this.pauseButton = null;
    }
  }

  closeOverlay() {
    if (this.currentOverlay) {
      this.currentOverlay.close();
      this.currentOverlay = null;
    }
  }
}

// 导出便捷方法
export const showTextWithMarker = (text: string, x: number, y: number) => {
  ScreenMarker.getInstance().showTextWithMarker(text, x, y);
};

export const closeScreenMarker = () => {
  ScreenMarker.getInstance().close();
};

export const showPredictionMarker = (
  predictions: PredictionParsed[],
  screenshotContext: NonNullable<Conversation['screenshotContext']>['size'],
) => {
  ScreenMarker.getInstance().showPredictionMarker(
    predictions,
    screenshotContext,
  );
};

export const showPauseButton = () => {
  ScreenMarker.getInstance().showPauseButton();
};

export const closeOverlay = () => {
  ScreenMarker.getInstance().closeOverlay();
};
