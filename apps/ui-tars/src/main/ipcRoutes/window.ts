/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { app } from 'electron';
import { initIpc } from '@ui-tars/electron-ipc/main';
import {
  closeSettingsWindow,
  createSettingsWindow,
  showWindow,
} from '@main/window/index';
import { appUpdater } from '@main/window/createWindow';
import { logger } from '../logger';

const t = initIpc.create();

export const windowRoute = t.router({
  openSettingsWindow: t.procedure.input<void>().handle(async () => {
    createSettingsWindow();
  }),
  closeSettingsWindow: t.procedure.input<void>().handle(async () => {
    closeSettingsWindow();
  }),
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
