/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portions Copyright 2024-present Bytedance, Inc. All rights reserved.
 * Use of this source code is governed by a MIT license that can be
 * found in https://github.com/web-infra-dev/midscene/blob/main/LICENSE
 *
 */
import { BrowserWindow, ipcMain, screen } from 'electron';

import { PredictionParsed, Conversation } from '@ui-tars/shared/types';

import * as env from '@main/env';
import { logger } from '@main/logger';

import { setOfMarksOverlays } from '@main/shared/setOfMarks';
import { server } from '@main/ipcRoutes';

class ScreenMarker {
  private static instance: ScreenMarker;
  private currentOverlay: BrowserWindow | null = null;
  private pauseButton: BrowserWindow | null = null;
  private screenWaterFlow: BrowserWindow | null = null;
  private lastShowPredictionMarkerPos: { xPos: number; yPos: number } | null =
    null;

  static getInstance(): ScreenMarker {
    if (!ScreenMarker.instance) {
      ScreenMarker.instance = new ScreenMarker();
    }
    return ScreenMarker.instance;
  }

  showScreenWaterFlow() {
    if (this.screenWaterFlow) {
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

    this.screenWaterFlow = new BrowserWindow({
      width: screenWidth,
      height: screenHeight,
      x: 0,
      y: 0,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      thickFrame: false,
      paintWhenInitiallyHidden: true,
      type: 'panel',
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    this.screenWaterFlow.setFocusable(false);
    this.screenWaterFlow.setContentProtection(false);
    this.screenWaterFlow.setIgnoreMouseEvents(true);

    this.screenWaterFlow.loadURL(`data:text/html;charset=UTF-8,
      <html>
        <head>
          <style id="water-flow-animation">
            html::before {
              content: "";
              position: fixed;
              top: 0; right: 0; bottom: 0; left: 0;
              pointer-events: none;
              z-index: 9999;
              background:
                linear-gradient(to right, rgba(30, 144, 255, 0.4), transparent 50%) left,
                linear-gradient(to left, rgba(30, 144, 255, 0.4), transparent 50%) right,
                linear-gradient(to bottom, rgba(30, 144, 255, 0.4), transparent 50%) top,
                linear-gradient(to top, rgba(30, 144, 255, 0.4), transparent 50%) bottom;
              background-repeat: no-repeat;
              background-size: 10% 100%, 10% 100%, 100% 10%, 100% 10%;
              animation: waterflow 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              filter: blur(8px);
            }

            @keyframes waterflow {
              0%, 100% {
                background-image:
                  linear-gradient(to right, rgba(30, 144, 255, 0.4), transparent 50%),
                  linear-gradient(to left, rgba(30, 144, 255, 0.4), transparent 50%),
                  linear-gradient(to bottom, rgba(30, 144, 255, 0.4), transparent 50%),
                  linear-gradient(to top, rgba(30, 144, 255, 0.4), transparent 50%);
                transform: scale(1);
              }
              25% {
                background-image:
                  linear-gradient(to right, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to left, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to bottom, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to top, rgba(30, 144, 255, 0.39), transparent 52%);
                transform: scale(1.03);
              }
              50% {
                background-image:
                  linear-gradient(to right, rgba(30, 144, 255, 0.38), transparent 55%),
                  linear-gradient(to left, rgba(30, 144, 255, 0.38), transparent 55%),
                  linear-gradient(to bottom, rgba(30, 144, 255, 0.38), transparent 55%),
                  linear-gradient(to top, rgba(30, 144, 255, 0.38), transparent 55%);
                transform: scale(1.05);
              }
              75% {
                background-image:
                  linear-gradient(to right, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to left, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to bottom, rgba(30, 144, 255, 0.39), transparent 52%),
                  linear-gradient(to top, rgba(30, 144, 255, 0.39), transparent 52%);
                transform: scale(1.03);
              }
            }
          </style>
        </head>
        <body></body>
      </html>
    `);
  }

  hideScreenWaterFlow() {
    this.screenWaterFlow?.close();
    this.screenWaterFlow = null;
  }

  hidePauseButton() {
    this.pauseButton?.close();
    this.pauseButton = null;
  }

  // 新增：显示暂停按钮
  showPauseButton() {
    if (this.pauseButton) {
      this.pauseButton.close();
      this.pauseButton = null;
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
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    this.pauseButton.setFocusable(false);
    this.pauseButton.setContentProtection(true); // not show for vlm model
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
    ipcMain.once('pause-button-clicked', async () => {
      await server.stopRun();
    });
  }

  // show Screen Marker in screen for prediction
  showPredictionMarker(
    predictions: PredictionParsed[],
    screenshotContext: NonNullable<Conversation['screenshotContext']>['size'],
  ) {
    const { overlays } = setOfMarksOverlays({
      predictions,
      screenshotContext,
      xPos: this.lastShowPredictionMarkerPos?.xPos,
      yPos: this.lastShowPredictionMarkerPos?.yPos,
    });

    // loop predictions
    for (let i = 0; i < overlays.length; i++) {
      const overlay = overlays[i];
      logger.info('[showPredictionMarker] prediction', overlay);

      try {
        this.closeOverlay();
        this.currentOverlay = new BrowserWindow({
          width: overlay.boxWidth || 300,
          height: overlay.boxHeight || 100,
          transparent: true,
          frame: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          focusable: false,
          hasShadow: false,
          thickFrame: false,
          paintWhenInitiallyHidden: true,
          type: 'panel',
          webPreferences: { nodeIntegration: true, contextIsolation: false },
          ...(overlay.xPos &&
            overlay.yPos && {
              x: overlay.xPos + overlay.offsetX,
              y: overlay.yPos + overlay.offsetY,
            }),
        });

        if (env.isWindows) {
          this.currentOverlay.setAlwaysOnTop(true, 'screen-saver');
        }

        this.currentOverlay.blur();
        this.currentOverlay.setFocusable(false);
        this.currentOverlay.setContentProtection(true); // not show for vlm model
        this.currentOverlay.setIgnoreMouseEvents(true, { forward: true });

        // 在 Windows 上设置窗口为工具窗口
        // if (process.platform === 'win32') {
        //   this.currentOverlay.setWindowButtonVisibility(false);
        //   const { SetWindowAttributes } = await import('windows-native-registry');
        //   SetWindowAttributes(this.currentOverlay.getNativeWindowHandle(), {
        //     toolWindow: true,
        //   });
        // }

        if (overlay.xPos && overlay.yPos) {
          this.lastShowPredictionMarkerPos = {
            xPos: overlay.xPos,
            yPos: overlay.yPos,
          };
        }

        if (overlay.svg) {
          this.currentOverlay.loadURL(`data:text/html;charset=UTF-8,
    <html>
      <body style="background: transparent; margin: 0;">
        ${overlay.svg}
      </body>
    </html>
    `);

          // max 5s close overlay
          setTimeout(() => {
            this.closeOverlay();
          }, 5000);
        }
      } catch (error) {
        logger.error('[showPredictionMarker] 显示预测标记失败:', error);
      }
    }
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
    if (this.screenWaterFlow) {
      this.screenWaterFlow.close();
      this.screenWaterFlow = null;
    }
  }

  closeOverlay() {
    if (this.currentOverlay) {
      this.currentOverlay.close();
      this.currentOverlay = null;
    }
  }
}

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

export const hidePauseButton = () => {
  ScreenMarker.getInstance().hidePauseButton();
};

export const showScreenWaterFlow = () => {
  ScreenMarker.getInstance().showScreenWaterFlow();
};

export const hideScreenWaterFlow = () => {
  ScreenMarker.getInstance().hideScreenWaterFlow();
};

export const closeOverlay = () => {
  ScreenMarker.getInstance().closeOverlay();
};
