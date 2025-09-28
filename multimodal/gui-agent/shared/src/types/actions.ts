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
  'click',
  {
    point: Coordinates;
  }
>;

/**
 * Right click action with coordinates
 */
export type RightClickAction = BaseAction<
  'right_click',
  {
    point: Coordinates;
  }
>;

/**
 * Double click action with coordinates
 */
export type DoubleClickAction = BaseAction<
  'double_click',
  {
    point: Coordinates;
  }
>;

/**
 * Middle click action with coordinates
 */
export type MiddleClickAction = BaseAction<
  'middle_click',
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
  'mouse_move', // 'move' | 'move_to' | 'hover',
  {
    point: Coordinates; // Target coordinates
  }
>;

/**
 * Drag action with start and end coordinates
 */
export type DragAction = BaseAction<
  'drag', // 'left_click_drag' | 'select',
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
  'swipe', // 'drag',
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
 * Operational action types (excluding screenshot which has special handling)
 */
export type OperationalGUIAction =
  | ClickAction
  | DoubleClickAction
  | RightClickAction
  | MiddleClickAction
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

/**
 * Complete GUI action types including screenshot
 */
export type GUIAction = ScreenShotAction | OperationalGUIAction;

/**
 * Extract action type from action interface
 */
export type ExtractActionType<T> = T extends BaseAction<infer U, any> ? U : never;

/**
 * Supported operational action types (excluding screenshot)
 */
export type SupportedActionType = ExtractActionType<OperationalGUIAction>;

/**
 * All action types including screenshot
 */
export type AllActionType = ExtractActionType<GUIAction>;

/**
 * Action metadata for documentation and serialization
 */
export interface ActionMetadata {
  description: string;
  category: 'mouse' | 'keyboard' | 'navigation' | 'mobile' | 'system' | 'wait';
}

/**
 * Comprehensive action metadata registry
 */
export const ACTION_METADATA: Record<SupportedActionType, ActionMetadata> = {
  click: { category: 'mouse', description: 'Click on an element' },
  right_click: { category: 'mouse', description: 'Right click on an element' },
  double_click: { category: 'mouse', description: 'Double click on an element' },
  middle_click: { category: 'mouse', description: 'Middle click on an element' },
  mouse_down: { category: 'mouse', description: 'Press mouse button down' },
  mouse_up: { category: 'mouse', description: 'Release mouse button' },
  mouse_move: { category: 'mouse', description: 'Move mouse to position' },
  drag: { category: 'mouse', description: 'Drag from one position to another' },
  scroll: { category: 'mouse', description: 'Scroll in a direction' },
  type: { category: 'keyboard', description: 'Type text' },
  hotkey: { category: 'keyboard', description: 'Press hotkey combination' },
  press: { category: 'keyboard', description: 'Press a key' },
  release: { category: 'keyboard', description: 'Release a key' },
  navigate: { category: 'navigation', description: 'Navigate to URL' },
  navigate_back: { category: 'navigation', description: 'Navigate back' },
  long_press: { category: 'mobile', description: 'Long press on element' },
  swipe: { category: 'mobile', description: 'Swipe gesture' },
  home: { category: 'mobile', description: 'Go to home' },
  press_home: { category: 'mobile', description: 'Press home button' },
  back: { category: 'mobile', description: 'Go back' },
  press_back: { category: 'mobile', description: 'Press back button' },
  open_app: { category: 'mobile', description: 'Open application' },
  wait: { category: 'wait', description: 'Wait for specified time' },
  finished: { category: 'system', description: 'Mark task as finished' },
  call_user: { category: 'system', description: 'Request user interaction' },
} as const;

/**
 * Type guard function to check if a string is a valid operational action type
 * @param type - The string to check
 * @returns Whether the string is a valid SupportedActionType
 */
export function isSupportedActionType(type: string): type is SupportedActionType {
  return type in ACTION_METADATA;
}

/**
 * Type guard function to check if a string is any valid action type (including screenshot)
 * @param type - The string to check
 * @returns Whether the string is a valid AllActionType
 */
export function isValidActionType(type: string): type is AllActionType {
  return type === 'screenshot' || isSupportedActionType(type);
}
