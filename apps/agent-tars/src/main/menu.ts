/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  dialog,
  app,
} from 'electron';
import { openLogFile, openLogDir } from './utils/logger';
import type { AppUpdater } from './utils/updateApp';

export default class MenuBuilder {
  mainWindow: BrowserWindow;
  appUpdater: AppUpdater;

  constructor(mainWindow: BrowserWindow, appUpdater: AppUpdater) {
    this.mainWindow = mainWindow;
    this.appUpdater = appUpdater;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template = this.buildDefaultTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;
      Menu.buildFromTemplate([
        {
          label: 'Inspect Element',
          click: () => {
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.inspectElement(x, y);
            }
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDefaultTemplate(): MenuItemConstructorOptions[] {
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'View Logs',
          click: async () => {
            await openLogFile();
          },
        },
        {
          label: 'Open Log Directory',
          click: async () => {
            await openLogDir();
          },
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const version = app.getVersion();
            dialog.showMessageBox(this.mainWindow, {
              title: 'About',
              message: `Agent TARS`,
              detail: `Version: ${version}\n\nAn open-source multimodal AI agent, offering seamless integration with a wide range of real-world tools.`,
              buttons: ['OK'],
              type: 'info',
            });
          },
        },
        {
          label: 'Check for Updates',
          click: () => {
            this.appUpdater.checkForUpdates();
          },
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://github.com/bytedance/UI-TARS-desktop');
          },
        },
      ],
    };

    const subMenuFile: MenuItemConstructorOptions = {
      label: 'File',
      submenu: [
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.close();
            }
          },
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };

    const subMenuEdit: MenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    };

    const subMenuView: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.reload();
            }
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
            }
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            if (!this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.toggleDevTools();
            }
          },
        },
      ],
    };

    const templateDefault = [
      subMenuFile,
      subMenuEdit,
      subMenuView,
      subMenuHelp,
    ];

    return templateDefault;
  }
}
