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
