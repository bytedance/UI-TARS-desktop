/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { IpcRenderer } from 'electron';
import type { ClientFromRouter, RouterType } from '../types';

export const createClient = <Router extends RouterType>({
  ipcInvoke,
}: {
  ipcInvoke: IpcRenderer['invoke'];
}) => {
  return new Proxy<ClientFromRouter<Router>>({} as ClientFromRouter<Router>, {
    get: (_, prop) => {
      const invoke = <TInput>(input: TInput) => {
        return ipcInvoke(prop.toString(), input);
      };

      return invoke;
    },
  });
};
