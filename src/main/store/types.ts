/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ComputerUseUserData, Conversation } from '@ui-tars/shared/types/data';

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
  // Ollama = 'ollama',
  Huggingface = 'Hugging Face',
  vLLM = 'vLLM',
}

export type LocalStore = {
  language: 'zh' | 'en';
  vlmProvider: VlmProvider;
  vlmBaseUrl: string;
  vlmApiKey: string;
  vlmModelName: string;
  screenshotScale: number; // 0.1 ~ 1.0
};
