/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { BaseAction } from '../types';

/**
 * Serializes a BaseAction into a string representation
 * Format: "actionType(param1='value1', param2='value2', ...)"
 */
export function serializeAction<T extends string, I extends Record<string, any>>(
  action: BaseAction<T, I>,
): string {
  const { type, inputs } = action;
  const params = Object.entries(inputs)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}='${value}'`;
      }
      if (typeof value === 'object' && value !== null) {
        if (value.raw) {
          return `${key}='(${value.raw.x}, ${value.raw.y})'`;
        }
        if (value.referenceBox) {
          return `${key}='<bbox>${value.referenceBox.x1}, ${value.referenceBox.y1}, ${value.referenceBox.x2}, ${value.referenceBox.y2}</bbox>'`;
        }
        if (value.normalized) {
          return `${key}='(${value.normalized.x}, ${value.normalized.y})'`;
        }
      }
      if (type === 'wait' && typeof value === 'number') {
        return `${key}='${value}s'`;
      }
      if (type === 'navigate' && typeof value === 'string') {
        return `url='${value}'`;
      }
      return `unsupported`;
    })
    .join(', ');
  return `${type}(${params})`;
}

const actionTypeMap: Record<string, string> = {
  // ---- ScreenShotAction ----

  snapshot: 'screenshot',
  screenshot: 'screenshot',
  take_screenshot: 'screenshot',
  takescreenshot: 'screenshot',

  // ---- Mouse Actions ----

  // click
  click: 'click',
  left_click: 'click',
  left_single: 'click',
  leftclick: 'click',
  leftsingle: 'click',
  // double click
  double_click: 'double_click',
  left_double: 'double_click',
  doubleclick: 'double_click',
  leftdouble: 'double_click',
  // right click
  right_click: 'right_click',
  right_single: 'right_click',
  rightclick: 'right_click',
  rightsingle: 'right_click',
  // middle click
  middle_click: 'middle_click',
  middle_single: 'middle_click',
  middleclick: 'middle_click',
  middlesingle: 'middle_click',
  // mouse move
  move: 'mouse_move',
  move_to: 'mouse_move',
  mouse_move: 'mouse_move',
  moveto: 'mouse_move',
  mousemove: 'mouse_move',
  hover: 'mouse_move',
  // mouse down
  mouse_down: 'mouse_down',
  mousedown: 'mouse_down',
  // mouse up
  mouse_up: 'mouse_up',
  mouseup: 'mouse_up',
  // drag
  drag: 'drag',
  select: 'drag',
  left_click_drag: 'drag',
  leftclickdrag: 'drag',
  // swipe
  swipe: 'swipe',
  // scroll
  scroll: 'scroll',

  // ---- Keyboard Actions ----

  type: 'type',
  hotkey: 'hotkey',
  press: 'press',
  release: 'release',

  // ---- Browser Actions ----

  navigate: 'navigate',
  navigate_back: 'navigate_back',
  navigateback: 'navigate_back',

  // ---- App Actions ----

  // long press
  long_press: 'long_press',
  longpress: 'long_press',
  // home
  home: 'press_home',
  press_home: 'press_home',
  presshome: 'press_home',
  // back
  back: 'press_back',
  press_back: 'press_back',
  pressback: 'press_back',
  // open app
  open: 'open_app',
  open_app: 'open_app',
  openapp: 'open_app',

  // ---- Agent Actions ----

  wait: 'wait',
  finished: 'finished',
  call_user: 'call_user',
  calluser: 'call_user',
};

export function unifyActionType(name: string) {
  name = name.toLowerCase();
  return actionTypeMap[name] || name;
}

const actionInputNameMap: Record<string, string> = {
  // ---- Start related fields ----
  start: 'start',
  start_box: 'start',
  startbox: 'start',
  start_point: 'start',
  start_position: 'start',
  start_coordinate: 'start',
  start_coordinates: 'start',

  // ---- End related fields ----
  end: 'end',
  end_box: 'end',
  endbox: 'end',
  end_point: 'end',
  end_position: 'end',
  end_coordinate: 'end',
  end_coordinates: 'end',

  // ---- Point related fields ----
  point: 'point',
  position: 'point',
  coordinate: 'point',
  coordinates: 'point',

  // ---- Button related fields ----
  button: 'button',
  mouse_button: 'button',
  mousebutton: 'button',

  // ---- Direction related fields ----
  direction: 'direction',
  dir: 'direction',
  scroll_direction: 'direction',
  scrolldirection: 'direction',

  // ---- Content related fields ----
  content: 'content',
  text: 'content',
  input_text: 'content',
  inputtext: 'content',
  type: 'content',

  // ---- Key related fields ----
  key: 'key',
  keyname: 'key',
  hotkey: 'key',
  keyboard_key: 'key',
  keyboardkey: 'key',

  // ---- URL related fields ----
  url: 'url',
  link: 'url',
  website: 'url',

  // ---- Name related fields ----
  name: 'name',
  appname: 'name',
  app_name: 'name',
  application: 'name',

  // ---- Time related fields ----
  time: 'time',
  duration: 'time',
  wait_time: 'time',
  waittime: 'time',
  delay: 'time',
};

// Special mappings based on action type
const actionTypeSpecificMappings: Record<string, Record<string, string>> = {
  navigate: {
    content: 'url',
    url: 'url',
  },
  open_app: {
    content: 'name',
    appname: 'name',
    app_name: 'name',
    name: 'name',
  },
};

/**
 * Standardizes action input field names using mapping tables
 * @param actionType The type of action being performed
 * @param inputName The original input field name
 * @returns The standardized input field name
 */
export function unifyActionInputName(actionType: string, inputName: string): string {
  actionType = actionType.toLowerCase();
  inputName = inputName.toLowerCase();
  actionType = unifyActionType(actionType);
  // First check for action type specific mappings
  const typeSpecificMap = actionTypeSpecificMappings[actionType];
  if (typeSpecificMap && typeSpecificMap[inputName]) {
    return typeSpecificMap[inputName];
  }
  // Then check general mappings
  return actionInputNameMap[inputName] || inputName;
}
