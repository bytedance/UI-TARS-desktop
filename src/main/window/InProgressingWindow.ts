/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow, screen } from 'electron';

import { createWindow } from './createWindow';

export class InProgressingWindow {
  private static instance: InProgressingWindow;
  private window: BrowserWindow | null = null;

  static getInstance(): InProgressingWindow {
    if (!InProgressingWindow.instance) {
      InProgressingWindow.instance = new InProgressingWindow();
    }
    return InProgressingWindow.instance;
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
      width: 180,
      height: 90,
      frame: false,
      focusable: false,
      resizable: false,
      movable: true,
      alwaysOnTop: true,
      titleBarStyle: 'default',
      transparent: true,
      skipTaskbar: true,
      type: 'toolbar',
      routerPath: '#in-progressing/',
    });

    const bounds = this.window.getBounds();
    const screenBounds = screen.getPrimaryDisplay().workArea;
    const x = Math.round(
      screenBounds.x + (screenBounds.width - bounds.width) / 2,
    );
    const y = screenBounds.y;
    this.window.setPosition(x, y);

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
