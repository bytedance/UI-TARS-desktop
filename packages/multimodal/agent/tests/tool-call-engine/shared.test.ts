/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ChatCompletion } from './../../src';
import { parseResponse } from './../../src/tool-call-engine/shared';

describe('shared tool-call-engine utilities', () => {
  describe('parseResponse', () => {
    it('should parse a basic text response', () => {
      const response = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677858242,
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'This is a test response',
            },
            index: 0,
            finish_reason: 'stop',
          },
        ],
      } as ChatCompletion;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "This is a test response",
        }
      `);
    });

    it('should parse a response with tool calls', () => {
      const response = {
        id: 'chatcmpl-456',
        object: 'chat.completion',
        created: 1677858242,
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I will help you with that',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'testTool',
                    arguments: '{"param":"value"}',
                  },
                },
              ],
            },
            index: 0,
            finish_reason: 'tool_calls',
          },
        ],
      } as ChatCompletion;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "I will help you with that",
          "toolCalls": [
            {
              "function": {
                "arguments": "{"param":"value"}",
                "name": "testTool",
              },
              "id": "call_123",
              "type": "function",
            },
          ],
        }
      `);
    });

    it('should handle empty content', () => {
      const response = {
        id: 'chatcmpl-789',
        object: 'chat.completion',
        created: 1677858242,
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '',
            },
            index: 0,
            finish_reason: 'stop',
          },
        ],
      } as ChatCompletion;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "",
        }
      `);
    });

    it('should parse a response with reasoning content', () => {
      const response = {
        id: 'chatcmpl-789',
        object: 'chat.completion',
        created: 1677858242,
        model: 'doubao-1.5-thinking',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Final answer',
              reasoning_content: 'Thinking about the problem...',
            },
            index: 0,
            finish_reason: 'stop',
          },
        ],
      } as any;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "Final answer",
          "reasoningContent": "Thinking about the problem...",
        }
      `);
    });

    it('should handle null content gracefully', () => {
      const response = {
        id: 'chatcmpl-null',
        object: 'chat.completion',
        created: 1677858242,
        model: 'gpt-4o',
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
            },
            index: 0,
            finish_reason: 'stop',
          },
        ],
      } as ChatCompletion;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "",
        }
      `);
    });

    it('should handle both reasoning content and tool calls', () => {
      const response = {
        id: 'chatcmpl-combined',
        object: 'chat.completion',
        created: 1677858242,
        model: 'doubao-1.5-thinking',
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I need to use a tool',
              reasoning_content: 'I should utilize the search function to find information',
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'search',
                    arguments: '{"query":"test query"}',
                  },
                },
              ],
            },
            index: 0,
            finish_reason: 'tool_calls',
          },
        ],
      } as any;

      const result = parseResponse(response);

      expect(result).toMatchInlineSnapshot(`
        {
          "content": "I need to use a tool",
          "reasoningContent": "I should utilize the search function to find information",
          "toolCalls": [
            {
              "function": {
                "arguments": "{"query":"test query"}",
                "name": "search",
              },
              "id": "call_456",
              "type": "function",
            },
          ],
        }
      `);
    });
  });
});
