/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
  },
}));

const loadBridges = async () => {
  vi.resetModules();
  const electron = await import('electron');
  const exposeInMainWorld = vi.mocked(electron.contextBridge.exposeInMainWorld);
  exposeInMainWorld.mockClear();
  await import('./index');

  const calls = exposeInMainWorld.mock.calls;
  const electronBridge = calls.find(
    (entry) => entry[0] === 'electron',
  )?.[1] as {
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      sendMessage: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, func: (...args: unknown[]) => void) => () => void;
      once: (channel: string, func: (...args: unknown[]) => void) => void;
    };
    setting: {
      onUpdate: (callback: (setting: unknown) => void) => () => void;
    };
    utio: {
      shareReport: (params: unknown) => Promise<unknown>;
    };
  };
  const zustandBridge = calls.find(
    (entry) => entry[0] === 'zustandBridge',
  )?.[1] as {
    subscribe: (callback: (state: unknown) => void) => () => void;
  };

  return {
    ipcRenderer: vi.mocked(electron.ipcRenderer),
    electronBridge,
    zustandBridge,
  };
};

describe('preload bridge contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows approved channels', async () => {
    const { ipcRenderer, electronBridge, zustandBridge } = await loadBridges();

    await electronBridge.ipcRenderer.invoke('showMainWindow');
    electronBridge.ipcRenderer.sendMessage('utio:shareReport', { ok: true });
    const unsubscribeSetting = electronBridge.setting.onUpdate(() => undefined);
    const unsubscribeState = zustandBridge.subscribe(() => undefined);

    expect(ipcRenderer.invoke).toHaveBeenCalledWith('showMainWindow');
    expect(ipcRenderer.send).toHaveBeenCalledWith('utio:shareReport', {
      ok: true,
    });
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'setting-updated',
      expect.any(Function),
    );
    expect(ipcRenderer.on).toHaveBeenCalledWith(
      'subscribe',
      expect.any(Function),
    );

    unsubscribeSetting();
    unsubscribeState();
    expect(ipcRenderer.removeListener).toHaveBeenCalled();
  });

  it('denies unknown channel', async () => {
    const { electronBridge } = await loadBridges();

    expect(() => electronBridge.ipcRenderer.invoke('unknown:channel')).toThrow(
      '[PRELOAD_IPC_DENY] invoke:unknown:channel',
    );

    expect(() =>
      electronBridge.ipcRenderer.sendMessage('unknown:channel'),
    ).toThrow('[PRELOAD_IPC_DENY] send:unknown:channel');
  });
});
