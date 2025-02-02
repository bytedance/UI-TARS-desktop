/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import ElectronStore from 'electron-store';

import * as env from '@main/env';

import { LocalStore, VlmProvider } from './types';

export class SettingStore {
  private static instance = new ElectronStore<LocalStore>({
    name: 'ui_tars.setting',
    defaults: {
      language: 'en',
      vlmProvider: (env.vlmProvider as VlmProvider) || VlmProvider.Huggingface,
      vlmBaseUrl: env.vlmBaseUrl || '',
      vlmApiKey: env.vlmApiKey || '',
      vlmModelName: env.vlmModelName || '',
    },
  });

  public static set<K extends keyof LocalStore>(
    key: K,
    value: LocalStore[K],
  ): void {
    SettingStore.instance.set(key, value);
  }

  public static setStore(state: LocalStore): void {
    SettingStore.instance.set(state);
  }

  public static get<K extends keyof LocalStore>(key: K): LocalStore[K] {
    return SettingStore.instance.get(key);
  }

  public static getStore(): LocalStore {
    return SettingStore.instance.store;
  }

  public static clear(): void {
    SettingStore.instance.clear();
  }

  public static openInEditor(): void {
    SettingStore.instance.openInEditor();
  }
}
