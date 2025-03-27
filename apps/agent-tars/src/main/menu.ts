/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  app,
} from 'electron';
import { openLogFile, openLogDir } from './utils/logger';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
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
            this.mainWindow.webContents.inspectElement(x, y);
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
            this.mainWindow.close();
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
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator:
            process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
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
