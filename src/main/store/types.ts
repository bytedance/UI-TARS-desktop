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
import {
  ComputerUseUserData,
  Conversation,
} from '@ui-tars/desktop-shared/types/data';

import { SettingStore } from './setting';

export type NextAction =
  | { type: 'key'; text: string }
  | { type: 'type'; text: string }
  | { type: 'mouse_move'; x: number; y: number }
  | { type: 'left_click' }
  | { type: 'left_click_drag'; x: number; y: number }
  | { type: 'right_click' }
  | { type: 'middle_click' }
  | { type: 'double_click' }
  | { type: 'screenshot' }
  | { type: 'cursor_position' }
  | { type: 'finish' }
  | { type: 'error'; message: string };

export type AppState = {
  theme: 'dark' | 'light';
  ensurePermissions: {
    screenCapture?: boolean;
    accessibility?: boolean;
  };
  instructions: string | null;
  restUserData: Omit<ComputerUseUserData, 'status' | 'conversations'> | null;
  status: ComputerUseUserData['status'];
  messages: ComputerUseUserData['conversations'];
  settings: Partial<LocalStore> | null;
  getSetting: typeof SettingStore.get;
  abortController: AbortController | null;
  thinking: boolean;

  // === dispatch ===
  OPEN_SETTINGS_WINDOW: () => void;
  CLOSE_SETTINGS_WINDOW: () => void;
  OPEN_LAUNCHER: () => void;
  CLOSE_LAUNCHER: () => void;
  SET_SETTINGS: typeof SettingStore.setStore;
  GET_SETTINGS: () => void;
  GET_ENSURE_PERMISSIONS: () => void;
  RUN_AGENT: () => void;
  STOP_RUN: () => void;
  SET_INSTRUCTIONS: (instructions: string) => void;
  SET_MESSAGES: (messages: Conversation[]) => void;
  CLEAR_HISTORY: () => void;
};

export enum VlmProvider {
  Ollama = 'ollama',
  Huggingface = 'huggingface',
}

export type LocalStore = {
  language: 'zh' | 'en';
  vlmProvider: VlmProvider;
  vlmBaseUrl: string;
  vlmApiKey: string;
  vlmModelName: string;
  screenshotScale: number; // 0.1 ~ 1.0
};
