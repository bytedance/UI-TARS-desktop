/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
