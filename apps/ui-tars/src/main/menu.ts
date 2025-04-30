/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow, Menu, MenuItemConstructorOptions, app } from 'electron';

import { isDev } from '@main/env';

import { exportLogs, revealLogDir, clearLogs } from './logger';
import type { AppUpdater } from '@main/utils/updateApp';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  browserWindow: BrowserWindow;
  appUpdater: AppUpdater;

  constructor(browserWindow: BrowserWindow, appUpdater: AppUpdater) {
    this.browserWindow = browserWindow;
    this.appUpdater = appUpdater;
  }

  buildMenu(): Menu {
    if (isDev) {
      // FIXME: 开发环境不显示 devtools
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.browserWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.browserWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.browserWindow });
    });
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'UI-TARS Desktop',
      submenu: [
        {
          label: 'About UI-TARS Desktop',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide UI-TARS Desktop',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.browserWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.browserWindow.setFullScreen(
              !this.browserWindow.isFullScreen(),
            );
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.browserWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.browserWindow.setFullScreen(
              !this.browserWindow.isFullScreen(),
            );
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            this.appUpdater.checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: 'Logs',
          submenu: [
            {
              label: 'Export Current Log',
              click: async () => {
                await exportLogs();
              },
            },
            {
              label: 'Open Log Directory',
              click: async () => {
                await revealLogDir();
              },
            },
            {
              label: 'Clear Logs',
              click: () => {
                clearLogs();
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          click: () => {
            this.browserWindow.webContents.toggleDevTools();
          },
        },
      ],
    };

    const subMenuView = isDev ? subMenuViewDev : subMenuViewProd;

    return [subMenuAbout, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Open',
            accelerator: 'Ctrl+O',
          },
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.browserWindow.close();
            },
          },
        ],
      },
      {
        label: '&View',
        submenu: isDev
          ? [
              {
                label: '&Reload',
                accelerator: 'Ctrl+R',
                click: () => {
                  this.browserWindow.webContents.reload();
                },
              },
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  this.browserWindow.setFullScreen(
                    !this.browserWindow.isFullScreen(),
                  );
                },
              },
            ]
          : [
              {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click: () => {
                  this.browserWindow.setFullScreen(
                    !this.browserWindow.isFullScreen(),
                  );
                },
              },
            ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Check for Updates',
            click: () => {
              this.appUpdater.checkForUpdates();
            },
          },
          {
            label: 'Logs',
            submenu: [
              {
                label: 'Export Current Log',
                click: async () => {
                  await exportLogs();
                },
              },
              {
                label: 'Open Log Directory',
                click: async () => {
                  await revealLogDir();
                },
              },
              {
                label: 'Clear Logs',
                click: () => {
                  clearLogs();
                },
              },
            ],
          },
          {
            label: 'Toggle &Developer Tools',
            accelerator: 'Alt+Ctrl+I',
            click: () => {
              this.browserWindow.webContents.toggleDevTools();
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
