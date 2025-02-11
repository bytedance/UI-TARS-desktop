/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { createStore } from 'zustand/vanilla';

import { StatusEnum, Conversation } from '@ui-tars/shared/types';

import * as env from '@main/env';
import { showWindow } from '@main/window/index';

import { closeScreenMarker } from '@main/window/ScreenMarker';
import { runAgent } from './runAgent';
import type { AppState } from './types';

export const store = createStore<AppState>(
  (set, get) =>
    ({
      theme: 'light',
      restUserData: null,
      instructions: '',
      status: StatusEnum.INIT,
      messages: [],
      errorMsg: null,
      ensurePermissions: {},

      abortController: null,
      thinking: false,

      GET_ENSURE_PERMISSIONS: async () => {
        if (env.isMacOS) {
          const { ensurePermissions } = await import(
            '@main/utils/systemPermissions'
          );
          set({ ensurePermissions: ensurePermissions() });
        } else {
          set({
            ensurePermissions: { screenCapture: true, accessibility: true },
          });
        }
      },

      RUN_AGENT: async () => {
        if (get().thinking) {
          return;
        }

        set({
          abortController: new AbortController(),
          thinking: true,
          errorMsg: null,
        });

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
        set({ instructions });
      },
      SET_MESSAGES: (messages: Conversation[]) => set({ messages }),
      CLEAR_HISTORY: () => {
        set({
          status: StatusEnum.END,
          messages: [],
          thinking: false,
          errorMsg: null,
        });
      },
    }) satisfies AppState,
);
