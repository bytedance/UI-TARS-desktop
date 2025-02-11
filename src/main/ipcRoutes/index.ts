/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { initIpc } from '@ui-tars/electron-ipc/main';
import { screenRoute } from './screen';
import { windowRoute } from './window';

const t = initIpc.create();

export const ipcRoutes = t.router({ ...screenRoute, ...windowRoute });
export type Router = typeof ipcRoutes;
