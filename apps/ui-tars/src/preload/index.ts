/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
// import { preloadZustandBridge } from 'zutron/preload';

import type { UTIOPayload } from '@ui-tars/utio';

import type { AppState, LocalStore } from '@main/store/types';

export type Channels = '';

const electronHandler = {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args),
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  utio: {
    shareReport: (params: UTIOPayload<'shareReport'>) =>
      ipcRenderer.invoke('utio:shareReport', params),
  },
  setting: {
    getSetting: () => ipcRenderer.invoke('setting:get'),
    clearSetting: () => ipcRenderer.invoke('setting:clear'),
    updateSetting: (setting: Partial<LocalStore>) =>
      ipcRenderer.invoke('setting:update', setting),
    importPresetFromText: (yamlContent: string) =>
      ipcRenderer.invoke('setting:importPresetFromText', yamlContent),
    importPresetFromUrl: (url: string, autoUpdate: boolean) =>
      ipcRenderer.invoke('setting:importPresetFromUrl', url, autoUpdate),
    updatePresetFromRemote: () =>
      ipcRenderer.invoke('setting:updatePresetFromRemote'),
    resetPreset: () => ipcRenderer.invoke('setting:resetPreset'),
    onUpdate: (callback: (setting: LocalStore) => void) => {
      ipcRenderer.on('setting-updated', (_, state) => callback(state));
    },
  },
  asr: {
    start: (config: { appKey: string; accessKey: string; wsUrl: string }) =>
      ipcRenderer.invoke('asr:start', config),
    sendAudio: (audioData: number[], isLast: boolean) =>
      ipcRenderer.invoke('asr:sendAudio', audioData, isLast),
    stop: () => ipcRenderer.invoke('asr:stop'),
    isActive: () => ipcRenderer.invoke('asr:isActive'),
    onStatus: (callback: (status: string) => void) => {
      const handler = (_: IpcRendererEvent, status: string) => callback(status);
      ipcRenderer.on('asr:status', handler);
      return () => ipcRenderer.removeListener('asr:status', handler);
    },
    onTranscript: (callback: (text: string, isFinal: boolean) => void) => {
      const handler = (_: IpcRendererEvent, text: string, isFinal: boolean) =>
        callback(text, isFinal);
      ipcRenderer.on('asr:transcript', handler);
      return () => ipcRenderer.removeListener('asr:transcript', handler);
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_: IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on('asr:error', handler);
      return () => ipcRenderer.removeListener('asr:error', handler);
    },
  },
};

// Initialize zustand bridge
const zustandBridge = {
  getState: () => ipcRenderer.invoke('getState'),
  subscribe: (callback) => {
    const subscription = (_: unknown, state: AppState) => callback(state);
    ipcRenderer.on('subscribe', subscription);

    return () => ipcRenderer.off('subscribe', subscription);
  },
};

// Expose both electron and zutron handlers
contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('zustandBridge', zustandBridge);
contextBridge.exposeInMainWorld('platform', process.platform);

export type ElectronHandler = typeof electronHandler;
