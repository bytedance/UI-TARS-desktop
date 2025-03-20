/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';
import {
  ModelProvider,
  SearchProvider,
  SearchSettings,
} from '@agent-infra/shared';
import { LLMConfig } from '@main/llmProvider/interfaces/LLMProvider';

export interface Settings {
  llmConfig: LLMConfig;
  searchConfig: SearchSettings;
}

export const DEFAULT_SETTING: Settings = {
  llmConfig: {
    configName: ModelProvider.OPENAI,
    model: 'gpt-4o',
    apiKey: '',
    apiVersion: '',
    baseURL: '',
  },
  searchConfig: {
    provider: SearchProvider.DUCKDUCKGO_SEARCH,
    apiKey: '',
  },
};

export class SettingStore {
  private static instance: ElectronStore<Settings>;

  public static getInstance(): ElectronStore<Settings> {
    if (!SettingStore.instance) {
      SettingStore.instance = new ElectronStore<Settings>({
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

  public static set<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ): void {
    SettingStore.getInstance().set(key, value);
  }

  public static setStore(state: Settings): void {
    SettingStore.getInstance().set(state);
  }

  public static get<K extends keyof Settings>(key: K): Settings[K] {
    return SettingStore.getInstance().get(key);
  }

  public static remove<K extends keyof Settings>(key: K): void {
    SettingStore.getInstance().delete(key);
  }

  public static getStore(): Settings {
    return SettingStore.getInstance().store;
  }

  public static clear(): void {
    SettingStore.getInstance().set(DEFAULT_SETTING);
  }

  public static openInEditor(): void {
    SettingStore.getInstance().openInEditor();
  }
}
