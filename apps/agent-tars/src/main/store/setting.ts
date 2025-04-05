/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserWindow } from 'electron';
import ElectronStore from 'electron-store';
import { AppSettings } from '@agent-infra/shared';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';
import { DEFAULT_SETTINGS } from '@shared/constants';
export class SettingStore {
  private static instance: ElectronStore<AppSettings>;

  public static getInstance(): ElectronStore<AppSettings> {
    if (!SettingStore.instance) {
      SettingStore.instance = new ElectronStore<AppSettings>({
        name: 'agent_tars.setting',
        defaults: DEFAULT_SETTINGS,
      });

      SettingStore.instance.onDidAnyChange((newValue, oldValue) => {
        logger.info(
          `[SettingStore] Before: ${JSON.stringify(maskSensitiveData(oldValue!))}`,
        );
        logger.info(
          `[SettingStore] After: ${JSON.stringify(maskSensitiveData(newValue!))}`,
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
    SettingStore.getInstance().set(DEFAULT_SETTINGS);
  }

  public static openInEditor(): void {
    SettingStore.getInstance().openInEditor();
  }
}
