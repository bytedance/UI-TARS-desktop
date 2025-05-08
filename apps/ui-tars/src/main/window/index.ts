/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';

import { logger } from '@main/logger';
import * as env from '@main/env';

import { createWindow } from './createWindow';

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

export function showInactive() {
  if (mainWindow) {
    // eslint-disable-next-line no-unused-expressions
    mainWindow.showInactive();
  }
}

export function show() {
  if (mainWindow) {
    mainWindow.show();
  }
}

export function createMainWindow() {
  mainWindow = createWindow({
    routerPath: '/',
    width: 1200,
    height: 700,
    alwaysOnTop: false,
  });

  mainWindow.on('close', (event) => {
    logger.info('mainWindow closed');
    if (env.isMacOS) {
      event.preventDefault();

      // Black screen on window close in fullscreen mode
      // https://github.com/electron/electron/issues/20263#issuecomment-633179965
      if (mainWindow?.isFullScreen()) {
        mainWindow?.setFullScreen(false);

        mainWindow?.once('leave-full-screen', () => {
          mainWindow?.hide();
        });
      } else {
        mainWindow?.hide();
      }
    } else {
      mainWindow = null;
    }
  });

  return mainWindow;
}

export function createSettingsWindow(
  config: { childPath?: string; showInBackground?: boolean } = {
    childPath: '',
    showInBackground: false,
  },
) {
  const { childPath = '', showInBackground = false } = config;
  if (settingsWindow) {
    settingsWindow.show();
    return settingsWindow;
  }

  const mainWindowBounds = mainWindow?.getBounds();
  console.log('mainWindowBounds', mainWindowBounds);

  const width = 600;
  const height = 600;

  let x, y;
  if (mainWindowBounds) {
    // 计算设置窗口的位置，使其相对于主窗口居中
    x = Math.round(mainWindowBounds.x + (mainWindowBounds.width - width) / 2);
    y = Math.round(mainWindowBounds.y + (mainWindowBounds.height - height) / 2);
  }

  settingsWindow = createWindow({
    routerPath: `#settings/${childPath}`,
    ...(x && y ? { x, y } : {}),
    width,
    height,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    showInBackground,
  });

  settingsWindow.on('close', (event) => {
    if (env.isMacOS) {
      event.preventDefault();

      // Black screen on window close in fullscreen mode
      // https://github.com/electron/electron/issues/20263#issuecomment-633179965
      if (settingsWindow?.isFullScreen()) {
        settingsWindow?.setFullScreen(false);

        settingsWindow?.once('leave-full-screen', () => {
          settingsWindow?.hide();
        });
      } else {
        settingsWindow?.hide();
      }
    } else {
      settingsWindow = null;
    }

    // if mainWindow is not visible, show it
    if (mainWindow?.isMinimized()) {
      mainWindow?.restore();
    }
    mainWindow?.setAlwaysOnTop(true);
    mainWindow?.show();
    mainWindow?.focus();
    setTimeout(() => {
      mainWindow?.setAlwaysOnTop(false);
    }, 100);
  });

  return settingsWindow;
}

export async function closeSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.close();
  }
}

export function setContentProtection(enable: boolean) {
  mainWindow?.setContentProtection(enable);
}

export async function showWindow() {
  mainWindow?.setContentProtection(false);
  mainWindow?.setIgnoreMouseEvents(false);
  mainWindow?.show();
  mainWindow?.restore();
}

export async function hideWindowBlock<T>(
  operation: () => Promise<T> | T,
): Promise<T> {
  let originalBounds: Electron.Rectangle | undefined;

  try {
    mainWindow?.setContentProtection(true);
    mainWindow?.setAlwaysOnTop(true);
    mainWindow?.setFocusable(false);
    try {
      mainWindow?.hide();
    } catch (e) {
      logger.error(e);
    }

    const result = await Promise.resolve(operation());
    return result;
  } finally {
    mainWindow?.setContentProtection(false);
    setTimeout(() => {
      mainWindow?.setAlwaysOnTop(false);
    }, 100);
    // restore mainWindow
    if (mainWindow && originalBounds) {
      mainWindow?.setBounds(originalBounds);
    }
    mainWindow?.setFocusable(true);
    mainWindow?.show();
  }
}

export { LauncherWindow } from './LauncherWindow';
