/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createStore } from 'zustand/vanilla';
import { createDispatch } from 'zutron/main';

import { StatusEnum } from '@ui-tars/shared/types';
import { Conversation } from '@ui-tars/shared/types/data';

import * as env from '@main/env';
import {
  LauncherWindow,
  closeSettingsWindow,
  createSettingsWindow,
  showWindow,
} from '@main/window/index';

import { closeScreenMarker } from './ScreenMarker';
import { runAgent } from './runAgent';
import { SettingStore } from './setting';
import { AppState } from './types';

export const store = createStore<AppState>(
  (set, get) =>
    ({
      theme: 'light',
      restUserData: null,
      instructions: '',
      status: StatusEnum.INIT,
      messages: [],
      settings: null,
      getSetting: (key) => SettingStore.get(key),
      ensurePermissions: {},

      abortController: null,
      thinking: false,

      // dispatch for renderer
      OPEN_SETTINGS_WINDOW: () => {
        createSettingsWindow();
      },

      CLOSE_SETTINGS_WINDOW: () => {
        closeSettingsWindow();
      },

      OPEN_LAUNCHER: () => {
        LauncherWindow.getInstance().show();
      },

      CLOSE_LAUNCHER: () => {
        LauncherWindow.getInstance().blur();
        LauncherWindow.getInstance().hide();
      },

      GET_SETTINGS: () => {
        const settings = SettingStore.getStore();
        set({ settings });
      },

      SET_SETTINGS: (state) => {
        SettingStore.setStore(state);
        set({ settings: SettingStore.getStore() });
      },

      GET_ENSURE_PERMISSIONS: async () => {
        if (env.isMacOS) {
          const { ensurePermissions } = await import(
            '@main/utils/systemPermissions'
          );
          set({ ensurePermissions: ensurePermissions() });
        } else {
          set({
            ensurePermissions: {
              screenCapture: true,
              accessibility: true,
            },
          });
        }
      },

      RUN_AGENT: async () => {
        if (get().thinking) {
          return;
        }

        set({ abortController: new AbortController(), thinking: true });

        await runAgent(set, get);

        set({ thinking: false });
      },
      STOP_RUN: () => {
        set({ status: StatusEnum.END, thinking: false });
        showWindow();
        get().abortController?.abort();

        closeScreenMarker();
      },
      SET_INSTRUCTIONS: (instructions) => {
        set({
          instructions,
        });
      },
      SET_MESSAGES: (messages: Conversation[]) => set({ messages }),
      CLEAR_HISTORY: () => {
        set({ status: StatusEnum.END, messages: [], thinking: false });
      },
    }) satisfies AppState,
);

export const dispatch = createDispatch(store);
