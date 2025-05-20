/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ChatCompletionChunk } from './../../src';
import { reconstructCompletion } from './../../src/utils/stream-utils';

describe('Stream Utils', () => {
  describe('reconstructCompletion', () => {
    it('should return valid empty structure for empty chunks array', () => {
      const result = reconstructCompletion([]);

      expect(result).toEqual({
        id: '',
        choices: [],
        created: expect.any(Number),
        model: '',
        object: 'chat.completion',
      });
    });

    it('should correctly rebuild a text-only completion', () => {
      const chunks: ChatCompletionChunk[] = [
        {
          id: 'chunk-1',
          choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
          created: 100,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-1',
          choices: [{ delta: { content: 'Hello' }, index: 0, finish_reason: null }],
          created: 100,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-1',
          choices: [{ delta: { content: ', world!' }, index: 0, finish_reason: null }],
          created: 100,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-1',
          choices: [{ delta: {}, finish_reason: 'stop', index: 0 }],
          created: 100,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
      ];

      const result = reconstructCompletion(chunks);

      expect(result).toEqual({
        id: 'chunk-1',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello, world!',
            },
            finish_reason: 'stop',
          },
        ],
        created: 100,
        model: 'test-model',
        object: 'chat.completion',
      });
    });

    it('should correctly rebuild a completion with tool calls', () => {
      const chunks: ChatCompletionChunk[] = [
        {
          id: 'chunk-2',
          choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
          created: 200,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-2',
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call-123',
                    type: 'function',
                    function: { name: 'testTool' },
                  },
                ],
              },
              index: 0,
              finish_reason: 'tool_calls',
            },
          ],
          created: 200,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-2',
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '{"param":' },
                  },
                ],
              },
              index: 0,
              finish_reason: 'tool_calls',
            },
          ],
          created: 200,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-2',
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: { arguments: '"value"}' },
                  },
                ],
              },
              index: 0,
              finish_reason: 'tool_calls',
            },
          ],
          created: 200,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-2',
          choices: [{ delta: {}, finish_reason: 'tool_calls', index: 0 }],
          created: 200,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
      ];

      const result = reconstructCompletion(chunks);

      expect(result).toEqual({
        id: 'chunk-2',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call-123',
                  type: 'function',
                  function: {
                    name: 'testTool',
                    arguments: '{"param":"value"}',
                  },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
        created: 200,
        model: 'test-model',
        object: 'chat.completion',
      });
    });

    it('should correctly handle reasoning content', () => {
      const chunks: ChatCompletionChunk[] = [
        {
          id: 'chunk-3',
          choices: [{ delta: { role: 'assistant' }, index: 0, finish_reason: null }],
          created: 300,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-3',
          // @ts-expect-error Testing non-standard reasoning_content field
          choices: [{ delta: { reasoning_content: 'This is ' }, index: 0 }],
          created: 300,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-3',
          // @ts-expect-error Testing non-standard reasoning_content field
          choices: [{ delta: { reasoning_content: 'reasoning.' }, index: 0 }],
          created: 300,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-3',
          choices: [{ delta: { content: 'This is content.' }, index: 0, finish_reason: null }],
          created: 300,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
        {
          id: 'chunk-3',
          choices: [{ delta: {}, finish_reason: 'stop', index: 0 }],
          created: 300,
          model: 'test-model',
          object: 'chat.completion.chunk',
        },
      ];

      const result = reconstructCompletion(chunks);

      expect(result.choices[0].message.content).toBe('This is content.');
      // @ts-expect-error Testing non-standard reasoning_content field
      expect(result.choices[0].message.reasoning_content).toBe('This is reasoning.');
    });
  });
});
