/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StructuredOutputsToolCallEngine,
  Tool,
  z,
  ChatCompletionChunk,
  ToolCallEnginePrepareRequestContext,
} from '../../src';
import {
  createMockAssistantMessageEventWithToolCalls,
  createMockToolCall,
} from '../agent/kernel/utils/testUtils';

describe('StructuredOutputsToolCallEngine', () => {
  let engine: StructuredOutputsToolCallEngine;

  beforeEach(() => {
    engine = new StructuredOutputsToolCallEngine();
  });

  describe('preparePrompt', () => {
    it('should return base prompt when no tools provided', () => {
      const basePrompt = 'You are a helpful assistant.';
      const result = engine.preparePrompt(basePrompt, []);
      expect(result).toBe(basePrompt);
    });

    it('should enhance prompt with tool information', () => {
      const basePrompt = 'You are a helpful assistant.';
      const tools: Tool[] = [
        new Tool({
          id: 'calculator',
          description: 'Perform mathematical calculations',
          parameters: z.object({
            operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
            a: z.number(),
            b: z.number(),
          }),
          function: async () => 'result',
        }),
      ];

      const result = engine.preparePrompt(basePrompt, tools);

      expect(result).toContain(basePrompt);
      expect(result).toContain('calculator');
      expect(result).toContain('Perform mathematical calculations');
      expect(result).toContain('toolCall');
      expect(result).toContain('args');
    });
  });

  describe('prepareRequest', () => {
    it('should prepare request without tools', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [],
        temperature: 0.7,
      };

      const result = engine.prepareRequest(context);

      expect(result.model).toBe('test-model');
      expect(result.messages).toEqual(context.messages);
      expect(result.temperature).toBe(0.7);
      expect(result.stream).toBe(true);
      expect(result.response_format).toBeUndefined();
    });

    it('should prepare request with JSON schema response format when tools are provided', () => {
      const context: ToolCallEnginePrepareRequestContext = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }],
        tools: [
          new Tool({
            id: 'test_tool',
            description: 'A test tool',
            parameters: z.object({ input: z.string() }),
            function: async () => 'result',
          }),
        ],
        temperature: 0.8,
      };

      const result = engine.prepareRequest(context);

      expect(result.model).toBe('test-model');
      expect(result.temperature).toBe(0.8);
      expect(result.response_format).toBeDefined();
      expect(result.response_format).toEqual({
        type: 'json_schema',
        json_schema: {
          name: 'agent_response_schema',
          strict: true,
          schema: expect.objectContaining({
            type: 'object',
            properties: expect.objectContaining({
              content: expect.any(Object),
              toolCall: expect.any(Object),
            }),
          }),
        },
      });
    });
  });

  describe('streaming processing', () => {
    it('should initialize stream processing state correctly', () => {
      const state = engine.initStreamProcessingState();

      expect(state.contentBuffer).toBe('');
      expect(state.toolCalls).toEqual([]);
      expect(state.reasoningBuffer).toBe('');
      expect(state.finishReason).toBeNull();
      expect(state.lastParsedContent).toBe('');
    });

    it('should process simple content chunks', () => {
      const state = engine.initStreamProcessingState();
      const chunk: ChatCompletionChunk = {
        id: 'chunk-1',
        choices: [
          {
            delta: { content: 'Hello world' },
            index: 0,
            finish_reason: null,
          },
        ],
        created: Date.now(),
        model: 'test-model',
        object: 'chat.completion.chunk',
      };

      const result = engine.processStreamingChunk(chunk, state);

      expect(result.content).toBe('Hello world');
      expect(result.hasToolCallUpdate).toBe(false);
      expect(result.streamingToolCallUpdates).toBeUndefined();
    });

    it('should handle incremental content updates', () => {
      const state = engine.initStreamProcessingState();

      const chunks = [
        '{"content": "Calculating',
        ' the sum of two numbers"',
        ', "toolCall": {"name": "add", "args": {"x": 1, "y": 2}}}',
      ];

      let accumulatedContent = '';

      chunks.forEach((chunkContent) => {
        const chunk: ChatCompletionChunk = {
          id: 'chunk-1',
          choices: [
            {
              delta: { content: chunkContent },
              index: 0,
              finish_reason: null,
            },
          ],
          created: Date.now(),
          model: 'test-model',
          object: 'chat.completion.chunk',
        };

        const result = engine.processStreamingChunk(chunk, state);
        accumulatedContent += result.content;
      });

      expect(accumulatedContent).toBe('Calculating the sum of two numbers');
    });

    it('should finalize streaming correctly', () => {
      const state = engine.initStreamProcessingState();

      // Simulate a complete JSON response
      state.contentBuffer =
        '{"content": "Result calculated", "toolCall": {"name": "calculator", "args": {"op": "add", "x": 10, "y": 20}}}';

      const result = engine.finalizeStreamProcessing(state);

      expect(result.content).toBe('Result calculated');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0].function.name).toBe('calculator');
      expect(result.finishReason).toBe('tool_calls');

      const args = JSON.parse(result.toolCalls?.[0].function.arguments || '{}');
      expect(args).toEqual({ op: 'add', x: 10, y: 20 });
    });

    it('should handle malformed JSON gracefully', () => {
      const state = engine.initStreamProcessingState();

      // Simulate malformed JSON
      state.contentBuffer = '{"content": "Hello", "toolCall": {"name": "test"'; // Incomplete JSON

      const result = engine.finalizeStreamProcessing(state);

      // Should not crash and provide reasonable defaults
      expect(result.content).toBeDefined();
      expect(result.finishReason).toBe('tool_calls');
    });
  });

  describe('message building', () => {
    it('should build historical assistant message correctly', () => {
      const toolCalls = [
        createMockToolCall('calculator', { operation: 'add', a: 5, b: 3 }, 'call_123'),
      ];
      const response = createMockAssistantMessageEventWithToolCalls(toolCalls, {
        content: "I'll calculate that for you",
      });

      const result = engine.buildHistoricalAssistantMessage(response);

      expect(result.role).toBe('assistant');
      expect(result.content).toBe("I'll calculate that for you");
      // Structured outputs should not include tool_calls in the message
      expect(result.tool_calls).toBeUndefined();
    });

    it('should build tool call result messages correctly', () => {
      const toolCallResults = [
        {
          toolCallId: 'call_123',
          toolName: 'calculator',
          content: [{ type: 'text' as const, text: 'The result is 8' }],
        },
      ];

      const result = engine.buildHistoricalToolCallResultMessages(toolCallResults);

      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toContain('calculator');
      expect(result[0].content).toContain('The result is 8');
    });
  });

  describe('edge cases', () => {
    it('should handle reasoning content', () => {
      const state = engine.initStreamProcessingState();
      const chunk: ChatCompletionChunk = {
        id: 'chunk-1',
        choices: [
          {
            delta: {
              content: 'normal content',
              // @ts-expect-error - reasoning_content is not in OpenAI types
              reasoning_content: 'thinking...',
            },
            index: 0,
            finish_reason: null,
          },
        ],
        created: Date.now(),
        model: 'test-model',
        object: 'chat.completion.chunk',
      };

      const result = engine.processStreamingChunk(chunk, state);

      expect(result.content).toBe('normal content');
      expect(result.reasoningContent).toBe('thinking...');
      expect(state.reasoningBuffer).toBe('thinking...');
    });

    it('should handle finish reason correctly', () => {
      const state = engine.initStreamProcessingState();
      const chunk: ChatCompletionChunk = {
        id: 'chunk-1',
        choices: [
          {
            delta: { content: 'final content' },
            index: 0,
            finish_reason: 'stop',
          },
        ],
        created: Date.now(),
        model: 'test-model',
        object: 'chat.completion.chunk',
      };

      const result = engine.processStreamingChunk(chunk, state);

      expect(state.finishReason).toBe('stop');

      const finalResult = engine.finalizeStreamProcessing(state);
      expect(finalResult.finishReason).toBe('stop');
    });

    it('should handle empty tool arguments', () => {
      const state = engine.initStreamProcessingState();
      state.contentBuffer = '{"content": "Done", "toolCall": {"name": "no_args_tool", "args": {}}}';

      const result = engine.finalizeStreamProcessing(state);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0].function.arguments).toBe('{}');
    });
  });
});
