/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initIpc, registerIpcMain, createServer } from '../src/main';
import { createClient } from '../src/renderer';
import { z } from 'zod';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  ipcRenderer: { invoke: vi.fn() },
}));

describe('@ui-tars/electron-ipc', () => {
  const mockIpcRenderer = { invoke: vi.fn() };

  const mockWebContents = {};
  const mockEvent = { sender: mockWebContents };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle basic IPC calls correctly', async () => {
    const t = initIpc.create();

    const router = t.router({
      hello: t.procedure
        .input<{ name: string }>()
        .handle(async ({ input }) => `Hello ${input.name}`),
    });

    registerIpcMain(router);

    const client = createClient({ ipcInvoke: mockIpcRenderer.invoke });

    // trigger
    await client.hello({ name: 'World' });

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('hello', {
      name: 'World',
    });
  });

  it('should handle Zod validation of input correctly', async () => {
    const t = initIpc.create();

    // use Zod schema
    const router = t.router({
      greet: t.procedure
        .input(z.object({ age: z.number().min(0) }))
        .handle(async ({ input }) => `Age: ${input.age}`),
    });

    registerIpcMain(router);

    const client = createClient({ ipcInvoke: mockIpcRenderer.invoke });

    await client.greet({ age: 25 });

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('greet', { age: 25 });
  });

  it('should handle server-side calls correctly', async () => {
    const t = initIpc.create();

    const router = t.router({
      greet: t.procedure
        .input(z.object({ name: z.string() }))
        .handle(async ({ input }) => `Hello ${input.name}`),
    });

    const server = createServer(router);

    const result = await server.greet({ name: 'Server' });

    expect(result).toBe('Hello Server');
  });
});
