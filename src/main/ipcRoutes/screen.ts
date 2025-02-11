/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { screen } from 'electron';
import { initIpc } from '@ui-tars/electron-ipc/main';

const t = initIpc.create();

export const screenRoute = t.router({
  getScreenSize: t.procedure.input<void>().handle(async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    return {
      screenWidth: primaryDisplay.size.width,
      screenHeight: primaryDisplay.size.height,
    };
  }),
});
