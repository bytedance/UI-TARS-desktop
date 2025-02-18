/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import {
  LauncherWindow,
  closeSettingsWindow,
  createSettingsWindow,
  showWindow,
} from '@main/window/index';

const t = initIpc.create();

export const windowRoute = t.router({
  openSettingsWindow: t.procedure.input<void>().handle(async () => {
    createSettingsWindow();
  }),
  closeSettingsWindow: t.procedure.input<void>().handle(async () => {
    closeSettingsWindow();
  }),
  openLauncher: t.procedure.input<void>().handle(async () => {
    LauncherWindow.getInstance().show();
  }),
  closeLauncher: t.procedure.input<void>().handle(async () => {
    LauncherWindow.getInstance().blur();
    LauncherWindow.getInstance().hide();
  }),
  showMainWindow: t.procedure.input<void>().handle(async () => {
    showWindow();
  }),
});
