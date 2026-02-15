/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
// import { preloadZustandBridge } from 'zutron/preload';

import type { UTIOPayload } from '@ui-tars/utio';
import type { Router } from '@main/ipcRoutes';

import type { AppState, LocalStore } from '@main/store/types';
import type { CodexOAuthState } from '@main/services/codexAuth';

const APPROVED_INVOKE_CHANNELS = {
  getScreenSize: true,
  showMainWindow: true,
  checkForUpdatesDetail: true,
  getEnsurePermissions: true,
  runAgent: true,
  pauseRun: true,
  resumeRun: true,
  stopRun: true,
  setInstructions: true,
  setMessages: true,
  setSessionHistoryMessages: true,
  getRecoveryCheckpoint: true,
  recoverFromCheckpoint: true,
  clearHistory: true,
  getReliabilityDashboard: true,
  evaluateReliabilityReleaseGates: true,
  allocRemoteResource: true,
  getRemoteResourceRDPUrl: true,
  releaseRemoteResource: true,
  getTimeBalance: true,
  checkBrowserAvailability: true,
  checkVLMResponseApiSupport: true,
  checkModelAvailability: true,
  codexAuthLogin: true,
  codexAuthLogout: true,
  codexAuthStatus: true,
  teachCaptureSnapshot: true,
  teachSaveSkill: true,
  teachListSkills: true,
  teachGetSkill: true,
  teachReplaySkill: true,
  teachExportSkill: true,
  teachImportSkill: true,
  teachDeleteSkill: true,
} as const satisfies Record<keyof Router, true>;

const APPROVED_LEGACY_INVOKE_CHANNELS = {
  'setting:get': true,
  'setting:clear': true,
  'setting:update': true,
  'setting:importPresetFromText': true,
  'setting:importPresetFromUrl': true,
  'setting:updatePresetFromRemote': true,
  'setting:resetPreset': true,
  getState: true,
  'utio:shareReport': true,
} as const;

const APPROVED_SEND_CHANNELS = {
  'utio:shareReport': true,
} as const;

const APPROVED_ON_CHANNELS = {
  'setting-updated': true,
  subscribe: true,
} as const;

type ApprovedInvokeChannel = keyof typeof APPROVED_INVOKE_CHANNELS;
type ApprovedLegacyInvokeChannel = keyof typeof APPROVED_LEGACY_INVOKE_CHANNELS;
type ApprovedSendChannel = keyof typeof APPROVED_SEND_CHANNELS;
type ApprovedOnChannel = keyof typeof APPROVED_ON_CHANNELS;

const isApprovedInvokeChannel = (
  channel: string,
): channel is ApprovedInvokeChannel => channel in APPROVED_INVOKE_CHANNELS;

const isApprovedLegacyInvokeChannel = (
  channel: string,
): channel is ApprovedLegacyInvokeChannel =>
  channel in APPROVED_LEGACY_INVOKE_CHANNELS;

const isApprovedSendChannel = (
  channel: string,
): channel is ApprovedSendChannel => channel in APPROVED_SEND_CHANNELS;

const isApprovedOnChannel = (channel: string): channel is ApprovedOnChannel =>
  channel in APPROVED_ON_CHANNELS;

const invokeChannel = (channel: string, ...args: unknown[]) => {
  if (!isApprovedInvokeChannel(channel)) {
    if (!isApprovedLegacyInvokeChannel(channel)) {
      throw new Error(`[PRELOAD_IPC_DENY] invoke:${channel}`);
    }
  }

  return ipcRenderer.invoke(channel, ...args);
};

const sendChannel = (channel: string, ...args: unknown[]) => {
  if (!isApprovedSendChannel(channel)) {
    throw new Error(`[PRELOAD_IPC_DENY] send:${channel}`);
  }

  ipcRenderer.send(channel, ...args);
};

const onChannel = (channel: string, func: (...args: unknown[]) => void) => {
  if (!isApprovedOnChannel(channel)) {
    throw new Error(`[PRELOAD_IPC_DENY] on:${channel}`);
  }

  const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
    func(...args);
  ipcRenderer.on(channel, subscription);

  return () => {
    ipcRenderer.removeListener(channel, subscription);
  };
};

const onceChannel = (channel: string, func: (...args: unknown[]) => void) => {
  if (!isApprovedOnChannel(channel)) {
    throw new Error(`[PRELOAD_IPC_DENY] once:${channel}`);
  }

  ipcRenderer.once(channel, (_event, ...args) => func(...args));
};

export type ZustandBridge = {
  getState: () => Promise<AppState>;
  subscribe: (callback: (state: AppState) => void) => () => void;
};

const electronHandler = {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) =>
      invokeChannel(channel, ...args),
    sendMessage(channel: string, ...args: unknown[]) {
      sendChannel(channel, ...args);
    },
    on(channel: string, func: (...args: unknown[]) => void) {
      return onChannel(channel, func);
    },
    once(channel: string, func: (...args: unknown[]) => void) {
      onceChannel(channel, func);
    },
  },
  utio: {
    shareReport: (params: UTIOPayload<'shareReport'>) =>
      invokeChannel('utio:shareReport', params),
  },
  setting: {
    getSetting: () => invokeChannel('setting:get'),
    clearSetting: () => invokeChannel('setting:clear'),
    updateSetting: (setting: Partial<LocalStore>) =>
      invokeChannel('setting:update', setting),
    importPresetFromText: (yamlContent: string) =>
      invokeChannel('setting:importPresetFromText', yamlContent),
    importPresetFromUrl: (url: string, autoUpdate: boolean) =>
      invokeChannel('setting:importPresetFromUrl', url, autoUpdate),
    updatePresetFromRemote: () =>
      invokeChannel('setting:updatePresetFromRemote'),
    resetPreset: () => invokeChannel('setting:resetPreset'),
    onUpdate: (callback: (setting: LocalStore) => void) => {
      return onChannel('setting-updated', (state) =>
        callback(state as LocalStore),
      );
    },
  },
  codexAuth: {
    login: (): Promise<CodexOAuthState> => invokeChannel('codexAuthLogin'),
    logout: (): Promise<CodexOAuthState> => invokeChannel('codexAuthLogout'),
    status: (): Promise<CodexOAuthState> => invokeChannel('codexAuthStatus'),
  },
};

// Initialize zustand bridge
const zustandBridge: ZustandBridge = {
  getState: () => invokeChannel('getState') as Promise<AppState>,
  subscribe: (callback) => {
    return onChannel('subscribe', (state) => callback(state as AppState));
  },
};

// Expose both electron and zutron handlers
contextBridge.exposeInMainWorld('electron', electronHandler);
contextBridge.exposeInMainWorld('zustandBridge', zustandBridge);
contextBridge.exposeInMainWorld('platform', process.platform);

export type ElectronHandler = typeof electronHandler;
