/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';

import { createWindow } from './createWindow';

export class LauncherWindow {
  private static instance: LauncherWindow;
  private window: BrowserWindow | null = null;

  static getInstance(): LauncherWindow {
    if (!LauncherWindow.instance) {
      LauncherWindow.instance = new LauncherWindow();
    }
    return LauncherWindow.instance;
  }

  getWindow() {
    return this.window;
  }

  blur() {
    this.window?.blur();
  }

  show() {
    if (this.window) {
      this.window.show();
      return;
    }

    this.window = createWindow({
      width: 700,
      height: 70,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      titleBarStyle: 'default',
      routerPath: '#launcher/',
    });

    this.window.center();

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  hide() {
    if (this.window) {
      this.window.hide();
    }
  }

  close() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
  }
}
