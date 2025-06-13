/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { GUIAgentData, Message } from '@ui-tars/shared/types';

import { LocalStore, PresetSource } from './validate';
import { ConversationWithSoM } from '@main/shared/types';

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
  ensurePermissions: { screenCapture?: boolean; accessibility?: boolean };
  instructions: string | null;
  restUserData: Omit<GUIAgentData, 'status' | 'conversations'> | null;
  status: GUIAgentData['status'];
  errorMsg: string | null;
  sessionHistoryMessages: Message[];
  messages: ConversationWithSoM[];
  abortController: AbortController | null;
  thinking: boolean;
  browserAvailable: boolean;
};

export enum VlmProvider {
  // Ollama = 'ollama',
  Huggingface = 'Hugging Face',
  vLLM = 'vLLM',
}

export enum VLMProviderV2 {
  ui_tars_1_0 = 'Hugging Face for UI-TARS-1.0',
  ui_tars_1_5 = 'Hugging Face for UI-TARS-1.5',
  doubao_1_5 = 'VolcEngine Ark for Doubao-1.5-UI-TARS',
  doubao_1_5_vl = 'VolcEngine Ark for Doubao-1.5-thinking-vision-pro',
}

export enum SearchEngineForSettings {
  GOOGLE = 'google',
  BAIDU = 'baidu',
  BING = 'bing',
}

export enum Operator {
  RemoteComputer = 'Remote Computer Operator',
  RemoteBrowser = 'Remote Browser Operator',
  LocalComputer = 'Local Computer Operator',
  LocalBrowser = 'Local Browser Operator',
}

export type { PresetSource, LocalStore };
