/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { screenRoute } from './screen';

const t = initIpc.create();

export const ipcRoutes = t.router({ ...screenRoute });
export type Router = typeof ipcRoutes;
