/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { app } from 'electron';
import { initIpc } from '@ui-tars/electron-ipc/main';
import { appUpdater } from '@main/window/createWindow';
import { logger } from '../logger';
import { showWindow } from '@main/window/index';

const t = initIpc.create();

export const windowRoute = t.router({
  showMainWindow: t.procedure.input<void>().handle(async () => {
    showWindow();
  }),
  checkForUpdatesDetail: t.procedure.input<void>().handle(async () => {
    if (appUpdater) {
      logger.info('checkForUpdatesDetail');

      const detail = await appUpdater.checkForUpdatesDetail();
      return {
        ...detail,
        isPackaged: app.isPackaged,
      };
    }
    return {
      currentVersion: app.getVersion(),
      isPackaged: app.isPackaged,
      updateInfo: null,
    };
  }),
});
