/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'path';

import { StatusEnum } from '@ui-tars/shared/types';

import { exportLogs } from '@main/logger';
import { createSettingsWindow, showWindow } from '@main/window';

import { store } from './store/create';
import { server } from '@main/ipcRoutes';

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
  const handleTrayClick = async () => {
    await server.stopRun();
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
          label: 'Export logs',
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
