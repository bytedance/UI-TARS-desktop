/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow, app, ipcMain, screen } from 'electron';

import { logger } from '@main/logger';

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
  ipcMain.removeHandler('minimize-window');
  ipcMain.removeHandler('maximize-window');
  ipcMain.removeHandler('close-window');

  mainWindow = createWindow({
    routerPath: '/',
    width: 450,
    height: 600,
    alwaysOnTop: false,
  });

  ipcMain.handle('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('close-window', async () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  app.on('activate', () => {
    const windows = BrowserWindow.getAllWindows();
    const existingWindow = windows.find((win) => !win.isDestroyed());

    if (!existingWindow) {
      createMainWindow();
    } else {
      if (!existingWindow.isVisible()) {
        existingWindow.show();
      }
      existingWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function createSettingsWindow(
  config: {
    childPath?: string;
    showInBackground?: boolean;
  } = {
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

  const width = 480;
  const height = 700;

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

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

export async function closeSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.close();
    settingsWindow = null;
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
    try {
      if (mainWindow) {
        originalBounds = mainWindow.getBounds();
        const { width: screenWidth } = screen.getPrimaryDisplay().size;
        mainWindow.setPosition(screenWidth - originalBounds.width, 0);
      }
    } catch (e) {
      logger.error(e);
    }
    mainWindow?.blur();

    const result = await Promise.resolve(operation());
    return result;
  } finally {
    mainWindow?.setContentProtection(false);
    mainWindow?.setAlwaysOnTop(false);
    // restore mainWindow
    if (mainWindow && originalBounds) {
      mainWindow?.setBounds(originalBounds);
    }
    mainWindow?.restore();
  }
}

export { LauncherWindow } from './LauncherWindow';
