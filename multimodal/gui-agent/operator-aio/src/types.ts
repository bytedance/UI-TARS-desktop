/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActionRequest {
  action_type: string;
  x?: number;
  y?: number;
  button?: string;
  num_clicks?: number;
  dx?: number;
  dy?: number;
  text?: string;
  key?: string;
  keys?: string[];
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface MoveToAction {
  action_type: 'MOVE_TO';
  x: number;
  y: number;
}

export interface ClickAction {
  action_type: 'CLICK';
  x?: number;
  y?: number;
  button?: string;
  num_clicks?: number;
}

export interface MouseDownAction {
  action_type: 'MOUSE_DOWN';
  button?: string;
}

export interface MouseUpAction {
  action_type: 'MOUSE_UP';
  button?: string;
}

export interface RightClickAction {
  action_type: 'RIGHT_CLICK';
  x?: number;
  y?: number;
}

export interface DoubleClickAction {
  action_type: 'DOUBLE_CLICK';
  x?: number;
  y?: number;
}

export interface DragToAction {
  action_type: 'DRAG_TO';
  x: number;
  y: number;
}

export interface ScrollAction {
  action_type: 'SCROLL';
  dx?: number;
  dy?: number;
}

export interface TypingAction {
  action_type: 'TYPING';
  text: string;
}

export interface PressAction {
  action_type: 'PRESS';
  key: string;
}

export interface KeyDownAction {
  action_type: 'KEY_DOWN';
  key: string;
}

export interface KeyUpAction {
  action_type: 'KEY_UP';
  key: string;
}

export interface HotkeyAction {
  action_type: 'HOTKEY';
  keys: string[];
}

export type AIOAction =
  | MoveToAction
  | ClickAction
  | MouseDownAction
  | MouseUpAction
  | RightClickAction
  | DoubleClickAction
  | DragToAction
  | ScrollAction
  | TypingAction
  | PressAction
  | KeyDownAction
  | KeyUpAction
  | HotkeyAction;

export interface ScreenshotResponse {
  success: boolean;
  message?: string;
  data?: {
    base64: string;
    scaleFactor: number;
    contentType?: string;
  };
}

export interface AIOHybridOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}
