/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from 'vitest';

import { KEY_MAPPINGS, normalizeKeys } from '../src/key-map';

describe('normalizeKeys', () => {
  // Regression coverage for #617: the model emits `hotkey(key='pagedown')`
  // when scrolling a page, but the browser operator used to reject it with
  // "Unsupported key: pagedown".
  it.each([
    ['pagedown', 'PageDown'],
    ['pageup', 'PageUp'],
    ['home', 'Home'],
    ['end', 'End'],
    ['insert', 'Insert'],
    ['space', 'Space'],
    ['spacebar', 'Space'],
    ['esc', 'Escape'],
    ['return', 'Enter'],
    ['del', 'Delete'],
  ])('maps the %s alias to %s', (key, expected) => {
    expect(KEY_MAPPINGS[key]).toBe(expected);
    expect(normalizeKeys(key)).toEqual([expected]);
  });

  it('resolves hotkey combinations containing a navigation key', () => {
    expect(normalizeKeys('ctrl+pagedown')).toEqual([
      KEY_MAPPINGS.ctrl,
      'PageDown',
    ]);
    expect(normalizeKeys('shift PageDown')).toEqual(['Shift', 'PageDown']);
  });

  it('keeps the existing mappings unchanged', () => {
    expect(normalizeKeys('enter')).toEqual(['Enter']);
    expect(normalizeKeys('a')).toEqual(['KeyA']);
    expect(normalizeKeys('f5')).toEqual(['F5']);
    expect(normalizeKeys('ctrl+a')).toEqual([KEY_MAPPINGS.ctrl, 'KeyA']);
    expect(normalizeKeys('alt+shift+tab')).toEqual(['Alt', 'Shift', 'Tab']);
  });

  it('still rejects unknown keys and reports the original spelling', () => {
    expect(() => normalizeKeys('F13')).toThrow('Unsupported key: F13');
    expect(() => normalizeKeys('ctrl+F13')).toThrow('Unsupported key: F13');
  });
});
