/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';
import {
  ModelProvider,
  ModelSettings,
  SearchProvider,
  SearchSettings,
  FileSystemSettings,
  AppSettings,
} from '@agent-infra/shared';

const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: ModelProvider.OPENAI,
  model: 'gpt-4o',
  apiKey: '',
  apiVersion: '',
  endpoint: '',
};

const DEFAULT_FILESYSTEM_SETTINGS: FileSystemSettings = {
  availableDirectories: [],
};

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  provider: SearchProvider.TAVILY,
  apiKey: '',
};

export const DEFAULT_SETTING: AppSettings = {
  model: DEFAULT_MODEL_SETTINGS,
  fileSystem: DEFAULT_FILESYSTEM_SETTINGS,
  search: DEFAULT_SEARCH_SETTINGS,
};

export class SettingStore {
  private static instance: ElectronStore<AppSettings>;

  public static getInstance(): ElectronStore<AppSettings> {
    if (!SettingStore.instance) {
      SettingStore.instance = new ElectronStore<AppSettings>({
        name: 'agent_tars.setting',
        defaults: DEFAULT_SETTING,
      });

      SettingStore.instance.onDidAnyChange((newValue, oldValue) => {
        console.log(
          `SettingStore: ${JSON.stringify(oldValue)} changed to ${JSON.stringify(newValue)}`,
        );
        // Notify that value updated
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send('setting-updated', newValue);
        });
      });
    }
    return SettingStore.instance;
  }

  public static set<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): void {
    SettingStore.getInstance().set(key, value);
  }

  public static setStore(state: AppSettings): void {
    SettingStore.getInstance().set(state);
  }

  public static get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return SettingStore.getInstance().get(key);
  }

  public static remove<K extends keyof AppSettings>(key: K): void {
    SettingStore.getInstance().delete(key);
  }

  public static getStore(): AppSettings {
    return SettingStore.getInstance().store;
  }

  public static clear(): void {
    SettingStore.getInstance().set(DEFAULT_SETTING);
  }

  public static openInEditor(): void {
    SettingStore.getInstance().openInEditor();
  }
}
