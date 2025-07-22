/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { checkAdbAvailability } from '../services/adbCheck';

const t = initIpc.create();

export const adbRoute = t.router({
  checkAdbAvailability: t.procedure.input<void>().handle(async () => {
    return await checkAdbAvailability();
  }),
});
