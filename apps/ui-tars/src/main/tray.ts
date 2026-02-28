/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'path';

import { StatusEnum } from '@ui-tars/shared/types';

import { exportLogs } from '@main/logger';
import { showWindow } from '@main/window';

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

  const runningIcon = nativeImage
    .createFromPath(path.join(__dirname, '../../resources/running-light.png'))
    .resize({ width: 16, height: 16 });

  tray = new Tray(normalIcon);
  // 初始化状态
  tray?.setImage(normalIcon);

  // 点击处理函数
  const handleTrayClick = async () => {
    const currentState = store.getState();

    if (currentState.status === StatusEnum.RUNNING) {
      await server.pauseRun();
    } else if (currentState.status === StatusEnum.PAUSE) {
      await server.resumeRun();
    }
  };

  // 监听状态变化
  store?.subscribe((state, prevState) => {
    if (state.status !== prevState.status) {
      // 更新右键菜单
      updateContextMenu();
      // 根据状态添加或移除点击事件监听

      // Remove the previous click listener
      tray?.removeListener('click', handleTrayClick);

      if (state.status === StatusEnum.RUNNING) {
        tray?.setImage(runningIcon);
        tray?.on('click', handleTrayClick); // left click to pause
      } else if (state.status === StatusEnum.PAUSE) {
        tray?.setImage(pauseIcon);
        tray?.on('click', handleTrayClick); // left click to resume
      } else {
        // Do not add click listener in non-running state
        tray?.setImage(normalIcon);
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
