/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { parseActionVlm } from '../src/actionParser';

describe('parseActionVlm', () => {
  // BC mode tests
  describe('BC mode', () => {
    it('should correctly parse input with Thought', () => {
      const input = `Thought: I need to click this button
Action: click(start_box='(100,200)')`;

      const result = parseActionVlm(input);

      expect(result).toEqual([
        {
          reflection: null,
          thought: 'I need to click this button',
          action_type: 'click',
          action_inputs: {
            start_box: '[0.1,0.2,0.1,0.2]',
          },
        },
      ]);
    });

    it('should correctly parse input with Reflection and Action_Summary', () => {
      const input = `Reflection: This is a reflection
Action_Summary: This is a summary
Action: type(text='Hello', start_box='(300,400)')`;

      const result = parseActionVlm(input);

      expect(result).toEqual([
        {
          reflection: 'This is a reflection',
          thought: 'This is a summary',
          action_type: 'type',
          action_inputs: {
            text: 'Hello',
            start_box: '[0.3,0.4,0.3,0.4]',
          },
        },
      ]);
    });

    it('should handle multiple actions', () => {
      const input = `Thought: Perform multiple actions
Action: click(start_box='(100,200)')

type(text='Hello', start_box='(300,400)')`;

      const result = parseActionVlm(input);

      expect(result).toEqual([
        {
          thought: 'Perform multiple actions',
          reflection: null,
          action_type: 'click',
          action_inputs: {
            start_box: '[0.1,0.2,0.1,0.2]',
          },
        },
        {
          thought: 'Perform multiple actions',
          reflection: null,
          action_type: 'type',
          action_inputs: {
            text: 'Hello',
            start_box: '[0.3,0.4,0.3,0.4]',
          },
        },
      ]);
    });
  });

  // O1 mode tests
  describe('O1 mode', () => {
    it('should correctly parse O1 format input', () => {
      const input = `<Thought>I need to perform this action</Thought>
Action_Summary: Click and type text
Action: click(start_box='(100,200)')
</Output>`;

      const result = parseActionVlm(input, 1000, 'o1');

      expect(result).toEqual([
        {
          reflection: null,
          thought:
            'I need to perform this action\n<Action_Summary>\nClick and type text',
          action_type: 'click',
          action_inputs: {
            start_box: '[0.1,0.2,0.1,0.2]',
          },
        },
      ]);
    });

    it('should handle complex O1 format input', () => {
      const input = `<Thought>Complex operation</Thought>
Action_Summary: Multiple sequential actions
Action: click(start_box='(100,200)')
</Output>`;

      const result = parseActionVlm(input, 1000, 'o1');

      expect(result).toEqual([
        {
          reflection: null,
          thought:
            'Complex operation\n<Action_Summary>\nMultiple sequential actions',
          action_type: 'click',
          action_inputs: {
            start_box: '[0.1,0.2,0.1,0.2]',
          },
        },
      ]);
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('should handle input without Action keyword', () => {
      const input = 'click(start_box="(100,200)")';
      const result = parseActionVlm(input);

      expect(result).toEqual([
        {
          action_inputs: {
            start_box: '[0.1]',
          },
          action_type: 'click',
          reflection: null,
          thought: '',
        },
      ]);
    });

    it('should handle empty action input', () => {
      const input = 'Thought: Empty action\nAction:';
      const result = parseActionVlm(input);

      expect(result).toEqual([
        {
          action_inputs: {},
          action_type: '',
          reflection: null,
          thought: 'Empty action',
        },
      ]);
    });
  });
});
