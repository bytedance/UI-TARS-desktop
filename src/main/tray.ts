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
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'path';

import { StatusEnum } from '@ui-tars/desktop-shared/types';

import { exportLogs } from '@main/logger';
import { createSettingsWindow, showWindow } from '@main/window';

import { store } from './store/create';

export let tray: Tray | null = null;

export async function createTray() {
  // 创建两种状态的图标
  const normalIcon = nativeImage
    .createFromPath(path.join(__dirname, '../../resources/logo-vector.png'))
    .resize({ width: 16, height: 16 });

  const pauseIcon = nativeImage
    .createFromPath(path.join(__dirname, '../../resources/pause-light.png'))
    .resize({ width: 16, height: 16 });

  tray = new Tray(normalIcon);
  // 初始化状态
  tray?.setImage(normalIcon);

  // 点击处理函数
  const handleTrayClick = () => {
    store.getState().STOP_RUN();
  };

  // 监听状态变化
  store?.subscribe((state, prevState) => {
    if (state.status !== prevState.status) {
      // 更新右键菜单
      updateContextMenu();
      // 根据状态添加或移除点击事件监听
      if (state.status === StatusEnum.RUNNING) {
        tray?.setImage(pauseIcon);
        tray?.on('click', handleTrayClick);
      } else {
        tray?.setImage(normalIcon);
        tray?.removeListener('click', handleTrayClick);
      }
    }
  });

  function updateContextMenu() {
    const isRunning = store.getState().status === StatusEnum.RUNNING;

    if (isRunning) {
      // 运行状态时移除右键菜单，只响应点击事件
      tray?.setContextMenu(null);
    } else {
      // 非运行状态时显示右键菜单，移除点击事件监听
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show',
          click: () => {
            showWindow();
          },
        },
        {
          label: 'Settings',
          click: () => {
            createSettingsWindow();
          },
        },
        {
          label: 'Logs',
          click: () => {
            exportLogs();
          },
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          },
        },
      ]);

      tray?.setContextMenu(contextMenu);
    }
  }

  // 初始化右键菜单
  updateContextMenu();

  return tray;
}
