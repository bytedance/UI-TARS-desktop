/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'node:path';
import { AppUpdater } from '@main/utils/updateApp';

import { BrowserWindow, app, shell } from 'electron';

import * as env from '@main/env';
import { logger } from '@main/logger';
import MenuBuilder from '@main/menu';

import icon from '@resources/icon.png?asset';

let appUpdater;

export function createWindow({
  width,
  height,
  showInBackground,

  routerPath = '',
  ...extraConfigs
}: {
  routerPath?: string;
  showInBackground?: boolean;
  width: number;
  height: number;
} & Electron.BrowserWindowConstructorOptions): BrowserWindow {
  let baseWindowConfig: Electron.BrowserWindowConstructorOptions = {
    show: false,
    width,
    height,
    movable: true,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: !!env.isDev,
    },
  };

  switch (true) {
    case env.isMacOS: {
      baseWindowConfig = {
        ...baseWindowConfig,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: {
          x: 16,
          y: 16,
        },
        visualEffectState: 'active',
        vibrancy: 'under-window',
        transparent: true,
      };
      break;
    }
    case env.isWindows: {
      baseWindowConfig = {
        ...baseWindowConfig,
        icon,
        autoHideMenuBar: true,
        frame: true,
      };
      break;
    }
    default: {
      baseWindowConfig.icon = icon;
    }
  }

  const browserWindowConfig = {
    ...baseWindowConfig,
    ...extraConfigs,
  };
  logger.info(
    '[createWindow]: routerPath: ',
    routerPath,
    'config: ',
    browserWindowConfig,
  );
  const browserWindow = new BrowserWindow(browserWindowConfig);

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  console.log('renderer url', env.rendererUrl);
  if (!app.isPackaged && env.rendererUrl) {
    browserWindow.loadURL(env.rendererUrl + routerPath);
  } else {
    browserWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: routerPath,
    });
  }

  browserWindow.on('ready-to-show', () => {
    const shouldShowWindow =
      !app.getLoginItemSettings().wasOpenedAsHidden && !showInBackground;
    if (shouldShowWindow) browserWindow.show();
  });

  if (!appUpdater) {
    appUpdater = new AppUpdater(browserWindow);
  }

  const menuBuilder = new MenuBuilder(browserWindow, appUpdater);
  menuBuilder.buildMenu();

  browserWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  return browserWindow;
}
