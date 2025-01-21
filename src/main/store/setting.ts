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
      vlmProvider: env.vlmProvider || VlmProvider.Huggingface,
      vlmBaseUrl: env.vlmBaseUrl || '',
      vlmApiKey: env.vlmApiKey || '',
      vlmModelName: env.vlmModelName || '',
    },
  });

  public static set<K extends keyof LocalStore>(
    key: K,
    value: LocalStore[K],
  ): void {
    // @ts-ignore
    SettingStore.instance.set(key, value);
  }

  public static setStore(state: LocalStore): void {
    // @ts-ignore
    SettingStore.instance.set(state);
  }

  public static get<K extends keyof LocalStore>(key: K): LocalStore[K] {
    // @ts-ignore
    return SettingStore.instance.get(key);
  }

  public static getStore(): LocalStore {
    // @ts-ignore
    return SettingStore.instance.store;
  }

  public static clear(): void {
    // @ts-ignore
    SettingStore.instance.clear();
  }

  public static openInEditor(): void {
    SettingStore.instance.openInEditor();
  }
}
