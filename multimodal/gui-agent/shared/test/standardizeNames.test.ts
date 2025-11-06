/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { unifyActionType, unifyActionInputName } from '../src/utils';

describe('unifyActionType', () => {
  describe('Mouse Actions', () => {
    it('should standardize click action types', () => {
      expect(unifyActionType('click')).toBe('click');
      expect(unifyActionType('left_click')).toBe('click');
      expect(unifyActionType('left_single')).toBe('click');
      expect(unifyActionType('Click')).toBe('click');
      expect(unifyActionType('CLICK')).toBe('click');
    });

    it('should standardize double click action types', () => {
      expect(unifyActionType('double_click')).toBe('double_click');
      expect(unifyActionType('left_double')).toBe('double_click');
      expect(unifyActionType('Double_Click')).toBe('double_click');
    });

    it('should standardize right click action types', () => {
      expect(unifyActionType('right_click')).toBe('right_click');
      expect(unifyActionType('right_single')).toBe('right_click');
    });

    it('should standardize middle click action types', () => {
      expect(unifyActionType('middle_click')).toBe('middle_click');
    });

    it('should standardize mouse move action types', () => {
      expect(unifyActionType('move')).toBe('mouse_move');
      expect(unifyActionType('move_to')).toBe('mouse_move');
      expect(unifyActionType('mouse_move')).toBe('mouse_move');
      expect(unifyActionType('hover')).toBe('mouse_move');
    });

    it('should standardize mouse down/up action types', () => {
      expect(unifyActionType('Mouse_Down')).toBe('mouse_down');
      expect(unifyActionType('mouse_up')).toBe('mouse_up');
      expect(unifyActionType('MOUSE_UP')).toBe('mouse_up');
    });

    it('should standardize drag action types', () => {
      expect(unifyActionType('drag')).toBe('drag');
      expect(unifyActionType('select')).toBe('drag');
      expect(unifyActionType('left_click_drag')).toBe('drag');
      // expect(unifyActionType('swipe')).toBe('drag');
      expect(unifyActionType('swipe')).toBe('swipe');
    });

    it('should standardize scroll action types', () => {
      expect(unifyActionType('scroll')).toBe('scroll');
      expect(unifyActionType('Scroll')).toBe('scroll');
      expect(unifyActionType('SCROLL')).toBe('scroll');
    });
  });

  describe('Keyboard Actions', () => {
    it('should standardize keyboard action types', () => {
      expect(unifyActionType('type')).toBe('type');
      expect(unifyActionType('hotkey')).toBe('hotkey');
      expect(unifyActionType('press')).toBe('press');
      expect(unifyActionType('release')).toBe('release');
    });
  });

  describe('Browser Actions', () => {
    it('should standardize browser action types', () => {
      expect(unifyActionType('navigate')).toBe('navigate');
      expect(unifyActionType('navigate_back')).toBe('navigate_back');
    });
  });

  describe('App Actions', () => {
    it('should standardize app action types', () => {
      expect(unifyActionType('long_press')).toBe('long_press');
      expect(unifyActionType('home')).toBe('press_home');
      expect(unifyActionType('press_home')).toBe('press_home');
      expect(unifyActionType('back')).toBe('press_back');
      expect(unifyActionType('press_back')).toBe('press_back');
      expect(unifyActionType('open')).toBe('open_app');
      expect(unifyActionType('open_app')).toBe('open_app');
    });
  });

  describe('Unknown Actions', () => {
    it('should return original name for unknown action types', () => {
      expect(unifyActionType('unknown_action')).toBe('unknown_action');
      expect(unifyActionType('custom_action')).toBe('custom_action');
      expect(unifyActionType('')).toBe('');
    });
  });
});

describe('unifyActionInputName', () => {
  describe('General Input Name Mappings', () => {
    it('should standardize start related fields', () => {
      expect(unifyActionInputName('click', 'start')).toBe('start');
      expect(unifyActionInputName('click', 'start_box')).toBe('start');
      expect(unifyActionInputName('click', 'startBox')).toBe('start');
      expect(unifyActionInputName('click', 'start_point')).toBe('start');
      expect(unifyActionInputName('click', 'start_position')).toBe('start');
      expect(unifyActionInputName('click', 'start_coordinate')).toBe('start');
      expect(unifyActionInputName('click', 'start_coordinates')).toBe('start');
    });

    it('should standardize end related fields', () => {
      expect(unifyActionInputName('drag', 'end')).toBe('end');
      expect(unifyActionInputName('drag', 'end_box')).toBe('end');
      expect(unifyActionInputName('drag', 'endBox')).toBe('end');
      expect(unifyActionInputName('drag', 'end_point')).toBe('end');
      expect(unifyActionInputName('drag', 'end_position')).toBe('end');
      expect(unifyActionInputName('drag', 'end_coordinate')).toBe('end');
      expect(unifyActionInputName('drag', 'end_coordinates')).toBe('end');
    });

    it('should standardize point related fields', () => {
      expect(unifyActionInputName('click', 'point')).toBe('point');
      expect(unifyActionInputName('click', 'position')).toBe('point');
      expect(unifyActionInputName('click', 'coordinate')).toBe('point');
      expect(unifyActionInputName('click', 'coordinates')).toBe('point');
    });

    it('should standardize button related fields', () => {
      expect(unifyActionInputName('click', 'button')).toBe('button');
      expect(unifyActionInputName('click', 'mouse_button')).toBe('button');
      expect(unifyActionInputName('click', 'mouseButton')).toBe('button');
    });

    it('should standardize direction related fields', () => {
      expect(unifyActionInputName('scroll', 'direction')).toBe('direction');
      expect(unifyActionInputName('scroll', 'dir')).toBe('direction');
      expect(unifyActionInputName('scroll', 'scroll_direction')).toBe('direction');
    });

    it('should standardize content related fields', () => {
      expect(unifyActionInputName('type', 'content')).toBe('content');
      expect(unifyActionInputName('type', 'text')).toBe('content');
      expect(unifyActionInputName('type', 'input_text')).toBe('content');
      expect(unifyActionInputName('type', 'type')).toBe('content');
    });

    it('should standardize key related fields', () => {
      expect(unifyActionInputName('press', 'key')).toBe('key');
      expect(unifyActionInputName('press', 'keyname')).toBe('key');
      expect(unifyActionInputName('press', 'hotkey')).toBe('key');
      expect(unifyActionInputName('press', 'keyboard_key')).toBe('key');
    });

    it('should standardize url related fields', () => {
      expect(unifyActionInputName('navigate', 'url')).toBe('url');
      expect(unifyActionInputName('navigate', 'link')).toBe('url');
      expect(unifyActionInputName('navigate', 'website')).toBe('url');
    });

    it('should standardize name related fields', () => {
      expect(unifyActionInputName('open_app', 'name')).toBe('name');
      expect(unifyActionInputName('open_app', 'appname')).toBe('name');
      expect(unifyActionInputName('open_app', 'app_name')).toBe('name');
      expect(unifyActionInputName('open_app', 'application')).toBe('name');
    });

    it('should standardize time related fields', () => {
      expect(unifyActionInputName('wait', 'time')).toBe('time');
      expect(unifyActionInputName('wait', 'duration')).toBe('time');
      expect(unifyActionInputName('wait', 'wait_time')).toBe('time');
      expect(unifyActionInputName('wait', 'delay')).toBe('time');
    });
  });

  describe('Action Type Specific Mappings', () => {
    it('should use navigate specific mappings', () => {
      expect(unifyActionInputName('navigate', 'url')).toBe('url');
      expect(unifyActionInputName('navigate', 'content')).toBe('url');
    });

    it('should use open_app specific mappings', () => {
      expect(unifyActionInputName('open_app', 'name')).toBe('name');
      expect(unifyActionInputName('open_app', 'content')).toBe('name');
      expect(unifyActionInputName('open_app', 'appname')).toBe('name');
      expect(unifyActionInputName('open_app', 'app_name')).toBe('name');
    });

    it('should prioritize action type specific mappings over general mappings', () => {
      // For navigate action, 'content' should map to 'url' (specific) not 'content' (general)
      expect(unifyActionInputName('navigate', 'content')).toBe('url');

      // For open_app action, 'content' should map to 'name' (specific) not 'content' (general)
      expect(unifyActionInputName('open_app', 'content')).toBe('name');

      // For other actions, 'content' should use general mapping
      expect(unifyActionInputName('type', 'content')).toBe('content');
    });
  });

  describe('Unknown Input Names', () => {
    it('should return original name for unknown input names', () => {
      expect(unifyActionInputName('click', 'unknown_field')).toBe('unknown_field');
      expect(unifyActionInputName('type', 'custom_field')).toBe('custom_field');
      expect(unifyActionInputName('navigate', 'invalid_field')).toBe('invalid_field');
      expect(unifyActionInputName('unknown_action', 'unknown_field')).toBe('unknown_field');
    });

    it('should handle empty strings', () => {
      expect(unifyActionInputName('click', '')).toBe('');
      expect(unifyActionInputName('', 'point')).toBe('point');
      expect(unifyActionInputName('', '')).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case sensitivity', () => {
      // The function should be case sensitive based on the implementation
      expect(unifyActionInputName('click', 'Point')).toBe('point');
      expect(unifyActionInputName('Navigate', 'content')).toBe('url');
    });

    it('should handle special characters and numbers', () => {
      expect(unifyActionInputName('click', 'field_123')).toBe('field_123');
      expect(unifyActionInputName('click', 'field-name')).toBe('field-name');
      expect(unifyActionInputName('click', 'field.name')).toBe('field.name');
    });
  });
});
