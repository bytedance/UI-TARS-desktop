/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Factors = [number, number];

/**
 * Coordinate data structure
 * - Supports pixel coordinates (raw)
 * - Supports normalized coordinates (normalized)
 */
export interface Coordinates {
  raw?: { x: number; y: number }; // Raw pixels
  normalized?: { x: number; y: number }; // Normalized coordinates (0–1)
  referenceBox?: { x1: number; y1: number; x2: number; y2: number };
  referenceSystem?: 'screen' | 'window' | 'browserPage' | string; // Coordinate reference system
}

/**
 * Standard structure for GUI Actions
 */
export interface BaseAction<
  T extends string = string,
  I extends Record<string, any> = Record<string, any>,
> {
  type: T; // Action type (e.g., "click", "key", "swipe")
  inputs: I; // Parameters required for the action
  meta?: {
    toolHint?: string; // Suggested execution tool (xdotool / adb / pyautogui etc.)
    comment?: string; // Notes / Debug information
  };
}

// ---------- ScreenShot Action ----------

/**
 * ScreenShot action
 */
export type ScreenShotAction = BaseAction<
  'screenshot',
  {
    start?: Coordinates;
    end?: Coordinates;
  }
>;

// ---------- Mouse Actions ----------

/**
 * Click action with coordinates
 */
export type ClickAction = BaseAction<
  'click' | 'left_click',
  {
    point: Coordinates;
  }
>;

/**
 * Right click action with coordinates
 */
export type RightClickAction = BaseAction<
  'right_click' | 'right_single',
  {
    point: Coordinates;
  }
>;

/**
 * Double click action with coordinates
 */
export type DoubleClickAction = BaseAction<
  'double_click' | 'left_double',
  {
    point: Coordinates;
  }
>;

/**
 * Mouse down action
 */
export type MouseDownAction = BaseAction<
  'mouse_down',
  {
    point?: Coordinates; // Mouse down position. If not specified, default to execute on the current mouse position.
    button?: 'left' | 'right'; // Down button. Default to left.
  }
>;

/**
 * Mouse up action
 */
export type MouseUpAction = BaseAction<
  'mouse_up',
  {
    point?: Coordinates; // Mouse up position. If not specified, default to execute on the current mouse position.
    button?: 'left' | 'right'; // Up button. Default to left.
  }
>;

/**
 * Mouse move action
 */
export type MouseMoveAction = BaseAction<
  'move' | 'move_to' | 'mouse_move' | 'hover',
  {
    point: Coordinates; // Target coordinates
  }
>;

/**
 * Drag action with start and end coordinates
 */
export type DragAction = BaseAction<
  'drag' | 'left_click_drag' | 'select',
  {
    start: Coordinates;
    end: Coordinates;
    direction?: 'up' | 'down' | 'left' | 'right';
  }
>;

/**
 * Scroll action with coordinates and direction
 */
export type ScrollAction = BaseAction<
  'scroll',
  {
    point?: Coordinates;
    direction: 'up' | 'down' | 'left' | 'right';
  }
>;

// ---------- Keyboard Actions ----------

/**
 * Type action with text content
 */
export type TypeAction = BaseAction<
  'type',
  {
    content: string;
  }
>;

/**
 * Hotkey action with key combination
 */
export type HotkeyAction = BaseAction<
  'hotkey',
  {
    key: string;
  }
>;

/**
 * Press key action
 */
export type PressAction = BaseAction<
  'press',
  {
    key: string; // Key you want to press. Only one key can be pressed at one time.
  }
>;

/**
 * Release key action
 */
export type ReleaseAction = BaseAction<
  'release',
  {
    key: string; // Key you want to release. Only one key can be released at one time.
  }
>;

// ---------- Browser Actions ----------

/**
 * Navigate action with URL
 */
export type NavigateAction = BaseAction<
  'navigate',
  {
    url: string;
  }
>;

/**
 * Navigate back action
 */
export type NavigateBackAction = BaseAction<'navigate_back', Record<string, never>>;

// ---------- App Actions ----------

/**
 * Long press action with coordinates
 */
export type LongPressAction = BaseAction<
  'long_press',
  {
    point: Coordinates;
  }
>;

export type SwipeAction = BaseAction<
  'swipe' | 'drag',
  {
    start: Coordinates;
    end: Coordinates;
    direction: 'up' | 'down' | 'left' | 'right';
  }
>;

/**
 * Home action
 */
export type HomeAction = BaseAction<'home' | 'press_home', Record<string, never>>;

/**
 * Back action
 */
export type BackAction = BaseAction<'back' | 'press_back', Record<string, never>>;

/**
 * Open app action
 */
export type OpenAppAction = BaseAction<
  'open_app',
  {
    name: string;
  }
>;

// ---------- Wait Actions ----------

/**
 * Wait action with no inputs
 */
export type WaitAction = BaseAction<
  'wait',
  {
    time?: number; // in seconds (optional)
  }
>;

/**
 * Finished - Complete the current operation.
 */
export type FinishAction = BaseAction<
  'finished',
  {
    content?: string;
  }
>;

/**
 * CallUser - Request user interaction.
 */
export type CallUserAction = BaseAction<
  'call_user',
  {
    content?: string;
  }
>;

/**
 * Combined type
 */
export type GUIAction =
  | ScreenShotAction
  | ClickAction
  | DoubleClickAction
  | RightClickAction
  | MouseDownAction
  | MouseUpAction
  | MouseMoveAction
  | DragAction
  | ScrollAction
  | TypeAction
  | HotkeyAction
  | PressAction
  | ReleaseAction
  | NavigateAction
  | NavigateBackAction
  | LongPressAction
  | SwipeAction
  | HomeAction
  | BackAction
  | OpenAppAction
  | WaitAction
  | FinishAction
  | CallUserAction;

export type ExtractActionType<T> = T extends BaseAction<infer U, any> ? U : never;
export type SupportedActionType = ExtractActionType<GUIAction>;

/**
 * Type guard function to check if a string is a valid action type
 * @param type - The string to check
 * @returns Whether the string is a valid SupportedActionType
 */
export function isSupportedActionType(type: string): type is SupportedActionType {
  const supportedTypes = [
    // Screenshot action
    'screenshot',

    // Mouse actions
    'click',
    'left_click',
    'right_click',
    'right_single',
    'double_click',
    'left_double',
    'mouse_down',
    'mouse_up',
    'move',
    'move_to',
    'drag',
    'left_click_drag',
    'select',
    'scroll',

    // Keyboard actions
    'type',
    'hotkey',
    'press',
    'release',

    // Browser actions
    'navigate',
    'navigate_back',

    // App actions
    'long_press',
    'swipe',
    'home',
    'press_home',
    'back',
    'press_back',
    'open_app',

    // Wait actions
    'wait',

    // Finish actions
    'finished',

    // Call user actions
    'call_user',
  ];

  return supportedTypes.includes(type);
}
