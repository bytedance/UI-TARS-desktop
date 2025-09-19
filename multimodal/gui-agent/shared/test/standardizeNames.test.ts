/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { standardizeActionType, standardizeActionInputName } from '../src/utils';

describe('standardizeActionType', () => {
  describe('Mouse Actions', () => {
    it('should standardize click action types', () => {
      expect(standardizeActionType('click')).toBe('click');
      expect(standardizeActionType('left_click')).toBe('click');
      expect(standardizeActionType('left_single')).toBe('click');
      expect(standardizeActionType('Click')).toBe('click');
      expect(standardizeActionType('CLICK')).toBe('click');
    });

    it('should standardize double click action types', () => {
      expect(standardizeActionType('double_click')).toBe('double_click');
      expect(standardizeActionType('left_double')).toBe('double_click');
      expect(standardizeActionType('Double_Click')).toBe('double_click');
    });

    it('should standardize right click action types', () => {
      expect(standardizeActionType('right_click')).toBe('right_click');
      expect(standardizeActionType('right_single')).toBe('right_click');
    });

    it('should standardize middle click action types', () => {
      expect(standardizeActionType('middle_click')).toBe('middle_click');
    });

    it('should standardize mouse move action types', () => {
      expect(standardizeActionType('move')).toBe('mouse_move');
      expect(standardizeActionType('move_to')).toBe('mouse_move');
      expect(standardizeActionType('mouse_move')).toBe('mouse_move');
      expect(standardizeActionType('hover')).toBe('mouse_move');
    });

    it('should standardize mouse down/up action types', () => {
      expect(standardizeActionType('Mouse_Down')).toBe('mouse_down');
      expect(standardizeActionType('mouse_up')).toBe('mouse_up');
      expect(standardizeActionType('MOUSE_UP')).toBe('mouse_up');
    });

    it('should standardize drag action types', () => {
      expect(standardizeActionType('drag')).toBe('drag');
      expect(standardizeActionType('select')).toBe('drag');
      expect(standardizeActionType('left_click_drag')).toBe('drag');
      // expect(standardizeActionType('swipe')).toBe('drag');
      expect(standardizeActionType('swipe')).toBe('swipe');
    });

    it('should standardize scroll action types', () => {
      expect(standardizeActionType('scroll')).toBe('scroll');
      expect(standardizeActionType('Scroll')).toBe('scroll');
      expect(standardizeActionType('SCROLL')).toBe('scroll');
    });
  });

  describe('Keyboard Actions', () => {
    it('should standardize keyboard action types', () => {
      expect(standardizeActionType('type')).toBe('type');
      expect(standardizeActionType('hotkey')).toBe('hotkey');
      expect(standardizeActionType('press')).toBe('press');
      expect(standardizeActionType('release')).toBe('release');
    });
  });

  describe('Browser Actions', () => {
    it('should standardize browser action types', () => {
      expect(standardizeActionType('navigate')).toBe('navigate');
      expect(standardizeActionType('navigate_back')).toBe('navigate_back');
    });
  });

  describe('App Actions', () => {
    it('should standardize app action types', () => {
      expect(standardizeActionType('long_press')).toBe('long_press');
      expect(standardizeActionType('home')).toBe('press_home');
      expect(standardizeActionType('press_home')).toBe('press_home');
      expect(standardizeActionType('back')).toBe('press_back');
      expect(standardizeActionType('press_back')).toBe('press_back');
      expect(standardizeActionType('open')).toBe('open_app');
      expect(standardizeActionType('open_app')).toBe('open_app');
    });
  });

  describe('Unknown Actions', () => {
    it('should return original name for unknown action types', () => {
      expect(standardizeActionType('unknown_action')).toBe('unknown_action');
      expect(standardizeActionType('custom_action')).toBe('custom_action');
      expect(standardizeActionType('')).toBe('');
    });
  });
});

describe('standardizeActionInputName', () => {
  describe('General Input Name Mappings', () => {
    it('should standardize start related fields', () => {
      expect(standardizeActionInputName('click', 'start')).toBe('start');
      expect(standardizeActionInputName('click', 'start_box')).toBe('start');
      expect(standardizeActionInputName('click', 'startBox')).toBe('start');
      expect(standardizeActionInputName('click', 'start_point')).toBe('start');
      expect(standardizeActionInputName('click', 'start_position')).toBe('start');
      expect(standardizeActionInputName('click', 'start_coordinate')).toBe('start');
      expect(standardizeActionInputName('click', 'start_coordinates')).toBe('start');
    });

    it('should standardize end related fields', () => {
      expect(standardizeActionInputName('drag', 'end')).toBe('end');
      expect(standardizeActionInputName('drag', 'end_box')).toBe('end');
      expect(standardizeActionInputName('drag', 'endBox')).toBe('end');
      expect(standardizeActionInputName('drag', 'end_point')).toBe('end');
      expect(standardizeActionInputName('drag', 'end_position')).toBe('end');
      expect(standardizeActionInputName('drag', 'end_coordinate')).toBe('end');
      expect(standardizeActionInputName('drag', 'end_coordinates')).toBe('end');
    });

    it('should standardize point related fields', () => {
      expect(standardizeActionInputName('click', 'point')).toBe('point');
      expect(standardizeActionInputName('click', 'position')).toBe('point');
      expect(standardizeActionInputName('click', 'coordinate')).toBe('point');
      expect(standardizeActionInputName('click', 'coordinates')).toBe('point');
    });

    it('should standardize button related fields', () => {
      expect(standardizeActionInputName('click', 'button')).toBe('button');
      expect(standardizeActionInputName('click', 'mouse_button')).toBe('button');
      expect(standardizeActionInputName('click', 'mouseButton')).toBe('button');
    });

    it('should standardize direction related fields', () => {
      expect(standardizeActionInputName('scroll', 'direction')).toBe('direction');
      expect(standardizeActionInputName('scroll', 'dir')).toBe('direction');
      expect(standardizeActionInputName('scroll', 'scroll_direction')).toBe('direction');
    });

    it('should standardize content related fields', () => {
      expect(standardizeActionInputName('type', 'content')).toBe('content');
      expect(standardizeActionInputName('type', 'text')).toBe('content');
      expect(standardizeActionInputName('type', 'input_text')).toBe('content');
      expect(standardizeActionInputName('type', 'type')).toBe('content');
    });

    it('should standardize key related fields', () => {
      expect(standardizeActionInputName('press', 'key')).toBe('key');
      expect(standardizeActionInputName('press', 'keyname')).toBe('key');
      expect(standardizeActionInputName('press', 'hotkey')).toBe('key');
      expect(standardizeActionInputName('press', 'keyboard_key')).toBe('key');
    });

    it('should standardize url related fields', () => {
      expect(standardizeActionInputName('navigate', 'url')).toBe('url');
      expect(standardizeActionInputName('navigate', 'link')).toBe('url');
      expect(standardizeActionInputName('navigate', 'website')).toBe('url');
    });

    it('should standardize name related fields', () => {
      expect(standardizeActionInputName('open_app', 'name')).toBe('name');
      expect(standardizeActionInputName('open_app', 'appname')).toBe('name');
      expect(standardizeActionInputName('open_app', 'app_name')).toBe('name');
      expect(standardizeActionInputName('open_app', 'application')).toBe('name');
    });

    it('should standardize time related fields', () => {
      expect(standardizeActionInputName('wait', 'time')).toBe('time');
      expect(standardizeActionInputName('wait', 'duration')).toBe('time');
      expect(standardizeActionInputName('wait', 'wait_time')).toBe('time');
      expect(standardizeActionInputName('wait', 'delay')).toBe('time');
    });
  });

  describe('Action Type Specific Mappings', () => {
    it('should use navigate specific mappings', () => {
      expect(standardizeActionInputName('navigate', 'url')).toBe('url');
      expect(standardizeActionInputName('navigate', 'content')).toBe('url');
    });

    it('should use open_app specific mappings', () => {
      expect(standardizeActionInputName('open_app', 'name')).toBe('name');
      expect(standardizeActionInputName('open_app', 'content')).toBe('name');
      expect(standardizeActionInputName('open_app', 'appname')).toBe('name');
      expect(standardizeActionInputName('open_app', 'app_name')).toBe('name');
    });

    it('should prioritize action type specific mappings over general mappings', () => {
      // For navigate action, 'content' should map to 'url' (specific) not 'content' (general)
      expect(standardizeActionInputName('navigate', 'content')).toBe('url');

      // For open_app action, 'content' should map to 'name' (specific) not 'content' (general)
      expect(standardizeActionInputName('open_app', 'content')).toBe('name');

      // For other actions, 'content' should use general mapping
      expect(standardizeActionInputName('type', 'content')).toBe('content');
    });
  });

  describe('Unknown Input Names', () => {
    it('should return original name for unknown input names', () => {
      expect(standardizeActionInputName('click', 'unknown_field')).toBe('unknown_field');
      expect(standardizeActionInputName('type', 'custom_field')).toBe('custom_field');
      expect(standardizeActionInputName('navigate', 'invalid_field')).toBe('invalid_field');
      expect(standardizeActionInputName('unknown_action', 'unknown_field')).toBe('unknown_field');
    });

    it('should handle empty strings', () => {
      expect(standardizeActionInputName('click', '')).toBe('');
      expect(standardizeActionInputName('', 'point')).toBe('point');
      expect(standardizeActionInputName('', '')).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case sensitivity', () => {
      // The function should be case sensitive based on the implementation
      expect(standardizeActionInputName('click', 'Point')).toBe('point');
      expect(standardizeActionInputName('Navigate', 'content')).toBe('url');
    });

    it('should handle special characters and numbers', () => {
      expect(standardizeActionInputName('click', 'field_123')).toBe('field_123');
      expect(standardizeActionInputName('click', 'field-name')).toBe('field-name');
      expect(standardizeActionInputName('click', 'field.name')).toBe('field.name');
    });
  });
});
