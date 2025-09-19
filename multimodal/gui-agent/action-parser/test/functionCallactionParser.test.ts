/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionParserHelper } from '../src/ActionParserHelper';

describe('ActionParserHelper', () => {
  let helper: ActionParserHelper;

  beforeEach(() => {
    helper = new ActionParserHelper();
  });

  describe('parseFunctionCallString', () => {
    it('should parse valid scroll action JSON string', () => {
      const input =
        '{"name": "scroll", "arguments": "{\\"direction\\": \\"up\\", \\"point\\": \\"<point>500 500</point>\\"}"}';
      const result = helper.parseFunctionCallString(input);

      expect(result).toBeTruthy();
      expect(result?.type).toBe('scroll');
      expect(result?.inputs).toHaveProperty('direction', 'up');
      expect(result).toEqual({
        type: 'scroll',
        inputs: {
          direction: 'up',
          point: {
            raw: {
              x: 500,
              y: 500,
            },
            referenceBox: {
              x1: 500,
              y1: 500,
              x2: 500,
              y2: 500,
            },
          },
        },
      });
    });

    it('should parse valid click action JSON string', () => {
      const input =
        '{"name": "left_double", "arguments": "{\\"point\\": \\"<point>18 58</point>\\"}"}';
      const result = helper.parseFunctionCallString(input);

      expect(result).toBeTruthy();
      expect(result?.type).toBe('double_click');
      expect(result).toEqual({
        type: 'double_click',
        inputs: {
          point: {
            raw: {
              x: 18,
              y: 58,
            },
            referenceBox: {
              x1: 18,
              y1: 58,
              x2: 18,
              y2: 58,
            },
          },
        },
      });
    });

    it('should parse valid type action JSON string', () => {
      const input =
        '{"name": "type", "arguments": "{\\"content\\": \\"hello\\", \\"point\\": \\"<point>200 126</point>\\"}"}';
      const result = helper.parseFunctionCallString(input);

      expect(result).toBeTruthy();
      expect(result?.type).toBe('type');
      expect(result?.inputs).toHaveProperty('content', 'hello');
      expect(result).toEqual({
        type: 'type',
        inputs: {
          content: 'hello',
          point: {
            raw: {
              x: 200,
              y: 126,
            },
            referenceBox: {
              x1: 200,
              y1: 126,
              x2: 200,
              y2: 126,
            },
          },
        },
      });
    });

    it('should parse valid hotkey action JSON string', () => {
      const input = '{"name": "hotkey", "arguments": "{\\"key\\": \\"enter\\"}"}';
      const result = helper.parseFunctionCallString(input);

      expect(result).toBeTruthy();
      expect(result?.type).toBe('hotkey');
      expect(result?.inputs).toHaveProperty('key', 'enter');
      expect(result).toEqual({
        type: 'hotkey',
        inputs: {
          key: 'enter',
        },
      });
    });

    it('should parse valid wait action JSON string with empty arguments', () => {
      const input = '{"name": "wait", "arguments": ""}';
      const result = helper.parseFunctionCallString(input);

      expect(result).toBeTruthy();
      expect(result?.type).toBe('wait');
      expect(result).toEqual({
        type: 'wait',
        inputs: {},
      });
    });

    it('should throw error for invalid JSON string', () => {
      const input = '{"name": "scroll", "arguments": invalid json}';

      expect(() => helper.parseFunctionCallString(input)).toThrow('Failed to parse GUI action');
    });

    it('should throw error for malformed function call object', () => {
      const input = '{"invalid": "structure"}';

      expect(() => helper.parseFunctionCallString(input)).toThrow();
    });

    it('should handle empty string input', () => {
      const input = '';

      expect(() => helper.parseFunctionCallString(input)).toThrow('Failed to parse GUI action');
    });

    it('should handle null-like string input', () => {
      const input = 'null';

      expect(() => helper.parseFunctionCallString(input)).toThrow();
    });

    it('should parse function call with malformed arguments JSON', () => {
      const input = '{"name": "scroll", "arguments": "invalid json arguments"}';

      expect(() => helper.parseFunctionCallString(input)).toThrow();
    });
  });

  describe('parseRoughFromFunctionCall', () => {
    it('should extract rough action from scroll function call', () => {
      const functionCall = {
        name: 'scroll',
        arguments: '{"direction": "up", "point": "<point>500 500</point>"}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'scroll',
        roughInputs: {
          direction: 'up',
          point: '<point>500 500</point>',
        },
      });
    });

    it('should extract rough action from click function call', () => {
      const functionCall = {
        name: 'left_double',
        arguments: '{"point": "<point>18 58</point>"}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'left_double',
        roughInputs: {
          point: '<point>18 58</point>',
        },
      });
    });

    it('should extract rough action from type function call', () => {
      const functionCall = {
        name: 'type',
        arguments: '{"content": "hello", "point": "<point>200 126</point>"}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'type',
        roughInputs: {
          content: 'hello',
          point: '<point>200 126</point>',
        },
      });
    });

    it('should extract rough action from hotkey function call', () => {
      const functionCall = {
        name: 'hotkey',
        arguments: '{"key": "enter"}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'hotkey',
        roughInputs: {
          key: 'enter',
        },
      });
    });

    it('should extract rough action from wait function call with empty arguments', () => {
      const functionCall = {
        name: 'wait',
        arguments: '',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'wait',
        roughInputs: {},
      });
    });

    it('should handle function call with null arguments', () => {
      const functionCall = {
        name: 'wait',
        arguments: null,
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'wait',
        roughInputs: {},
      });
    });

    it('should handle function call with undefined arguments', () => {
      const functionCall = {
        name: 'wait',
        arguments: undefined,
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'wait',
        roughInputs: {},
      });
    });

    it('should throw error for invalid arguments JSON', () => {
      const functionCall = {
        name: 'scroll',
        arguments: 'invalid json',
      };
      expect(() => helper.parseRoughFromFunctionCall(functionCall)).toThrow();
    });

    it('should handle complex nested JSON arguments', () => {
      const functionCall = {
        name: 'complex_action',
        arguments: '{"nested": {"key": "value"}, "array": [1, 2, 3]}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'complex_action',
        roughInputs: {
          nested: { key: 'value' },
          array: [1, 2, 3],
        },
      });
    });

    it('should handle function call with special characters in arguments', () => {
      const functionCall = {
        name: 'type',
        arguments: '{"content": "Hello\\nWorld\\t!", "special": "chars@#$%"}',
      };
      const result = helper.parseRoughFromFunctionCall(functionCall);
      expect(result).toEqual({
        roughType: 'type',
        roughInputs: {
          content: 'Hello\nWorld\t!',
          special: 'chars@#$%',
        },
      });
    });
  });
});
