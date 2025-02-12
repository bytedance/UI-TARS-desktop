/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { WebContents } from 'electron';
import { RouterType, ServerFromRouter } from '../types';

export const createServer = <Router extends RouterType>(router: Router) => {
  return new Proxy<ServerFromRouter<Router>>({} as ServerFromRouter<Router>, {
    get: (_, prop: string) => {
      const route = router[prop];
      return (input: any, sender?: WebContents) => {
        return route.handle({ context: { sender: sender || null }, input });
      };
    },
  });
};
