/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { z } from 'zod';
import { initIpc, registerIpcMain } from '../src/main';

const t = initIpc.create();

const router = t.router({
  hello: t.procedure
    .input<{ a: string }>()
    .handle(async ({ input }) => 'hello' + input.a),
  world: t.procedure
    .input(z.object({ b: z.string() }))
    .handle(async ({ input }) => input.b),
});

export type AppRouter = typeof router;

// main.ts
registerIpcMain(router);

// renderer.ts
import { createClient } from '../src/renderer';

const client = createClient<AppRouter>({
  ipcInvoke: window.Electron.ipcRenderer.invoke,
});

await client.hello({ a: '123' });
await client.world({ b: '123' });
