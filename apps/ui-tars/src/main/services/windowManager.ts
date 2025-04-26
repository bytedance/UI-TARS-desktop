/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';
import { store } from '../store/create';
import { sanitizeState } from '../utils/sanitizeState';

class WindowManager {
  private static instance: WindowManager;
  private windows: Set<BrowserWindow> = new Set();

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  registerWindow(window: BrowserWindow) {
    this.windows.add(window);

    // Send current state to new window
    const state = store.getState();
    window.webContents.send('subscribe', sanitizeState(state));

    window.on('closed', () => {
      this.windows.delete(window);
    });
  }

  broadcast(channel: string, data: any) {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
}

export const windowManager = WindowManager.getInstance();
