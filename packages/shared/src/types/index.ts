/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export interface Message {
  from: 'gpt' | 'human';
  value: string; // <image>
}

export type Status = `${StatusEnum}`;
export enum StatusEnum {
  RUNNING = 'running',
  END = 'end',
  INIT = 'init',
  MAX_LOOP = 'max_loop',
}
export interface VlmResponse {
  generate_resp: {
    input: string;
    prediction: string;
    uid: string;
  }[];
}

export interface ScreenshotResult {
  base64: string;
  width: number;
  height: number;
}

export type ActionInputs = Partial<
  Record<
    'content' | 'start_box' | 'end_box' | 'key' | 'hotkey' | 'direction',
    string
  >
>;

export interface PredictionParsed {
  action_inputs: ActionInputs;
  reflection?: string;
  action_type: string;
  thought: string;
}
