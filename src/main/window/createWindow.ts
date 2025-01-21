/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import path from 'node:path';

import { BrowserWindow, app, shell } from 'electron';

import * as env from '@main/env';
import { logger } from '@main/logger';
import MenuBuilder from '@main/menu';

import icon from '@resources/icon.png?asset';

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

  const menuBuilder = new MenuBuilder(browserWindow);
  menuBuilder.buildMenu();

  browserWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  return browserWindow;
}
