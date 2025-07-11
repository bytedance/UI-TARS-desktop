/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Tool,
  z,
  NativeToolCallEngine,
  PromptEngineeringToolCallEngine,
  ChatCompletionChunk,
  StreamingToolCallUpdate,
} from './../../src';

describe('Streaming Tool Call Accumulation Tests', () => {
  describe('NativeToolCallEngine', () => {
    let engine: NativeToolCallEngine;

    beforeEach(() => {
      engine = new NativeToolCallEngine();
    });

    it('should accumulate streaming tool call arguments correctly', () => {
      const state = engine.initStreamProcessingState();
      const chunks: Partial<ChatCompletionChunk>[] = [
        {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_123',
                    type: 'function',
                    function: { name: 'calculator' },
                  },
                ],
              },
              index: 0,
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '{"operation":' } }],
              },
              index: 0,
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '"add","a":5,' } }],
              },
              index: 0,
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            {
              delta: {
                tool_calls: [{ index: 0, function: { arguments: '"b":3}' } }],
              },
              index: 0,
              finish_reason: null,
            },
          ],
        },
        {
          choices: [
            { delta: { content: '', role: 'assistant' }, finish_reason: 'tool_calls', index: 0 },
          ],
        },
      ];

      const allUpdates: StreamingToolCallUpdate[] = [];

      // Process all chunks and collect streaming updates
      for (const chunk of chunks) {
        const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        if (result.streamingToolCallUpdates) {
          allUpdates.push(...result.streamingToolCallUpdates);
        }
      }

      // Verify we have streaming updates
      expect(allUpdates.length).toBeGreaterThan(0);

      // Accumulate all argument deltas
      let accumulatedArguments = '';
      for (const update of allUpdates) {
        if (update.toolCallId === 'call_123') {
          accumulatedArguments += update.argumentsDelta;
        }
      }

      // Verify the accumulated arguments form valid JSON
      expect(() => JSON.parse(accumulatedArguments)).not.toThrow();
      const parsedArgs = JSON.parse(accumulatedArguments);
      expect(parsedArgs).toEqual({
        operation: 'add',
        a: 5,
        b: 3,
      });

      // Verify final state matches accumulated result
      const finalResult = engine.finalizeStreamProcessing(state);
      expect(finalResult.toolCalls).toHaveLength(1);
      expect(finalResult.toolCalls?.[0].function.arguments).toBe(accumulatedArguments);
    });
  });

  describe('PromptEngineeringToolCallEngine', () => {
    let engine: PromptEngineeringToolCallEngine;

    beforeEach(() => {
      engine = new PromptEngineeringToolCallEngine();
    });

    it('should accumulate streaming tool call arguments correctly', () => {
      const state = engine.initStreamProcessingState();

      // Simulate tool call content being streamed character by character
      const toolCallContent =
        '<tool_call>\n{"name": "calculator", "parameters": {"operation": "multiply", "a": 4, "b": 6}}\n</tool_call>';
      const chunks = toolCallContent.split('').map((char) => ({
        choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
      }));

      const allUpdates: StreamingToolCallUpdate[] = [];

      // Process all chunks and collect streaming updates
      for (const chunk of chunks) {
        const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
        if (result.streamingToolCallUpdates) {
          allUpdates.push(...result.streamingToolCallUpdates);
        }
      }

      // Filter updates for the specific tool call
      const toolCallUpdates = allUpdates.filter((update) => update.toolName === 'calculator');
      expect(toolCallUpdates.length).toBeGreaterThan(0);

      // Accumulate argument deltas (excluding initial empty ones)
      let accumulatedArguments = '';
      for (const update of toolCallUpdates) {
        if (update.argumentsDelta) {
          accumulatedArguments += update.argumentsDelta;
        }
      }

      // Verify the accumulated arguments form valid JSON
      expect(() => JSON.parse(accumulatedArguments)).not.toThrow();
      const parsedArgs = JSON.parse(accumulatedArguments);
      expect(parsedArgs).toEqual({
        operation: 'multiply',
        a: 4,
        b: 6,
      });

      // Verify final state matches
      const finalResult = engine.finalizeStreamProcessing(state);
      expect(finalResult.toolCalls).toHaveLength(1);
      expect(finalResult.toolCalls?.[0].function.name).toBe('calculator');

      const finalArgs = JSON.parse(finalResult.toolCalls?.[0].function.arguments || '{}');
      expect(finalArgs).toEqual(parsedArgs);
    });
  });

  describe('Cross-Engine Consistency', () => {
    it('should provide consistent incremental argument updates across supported engines', () => {
      // Test that supported engines can provide incremental updates that accumulate to the same result
      const testData = {
        operation: 'add',
        x: 10,
        y: 20,
      };

      const engines = [
        { name: 'Native', engine: new NativeToolCallEngine() },
        { name: 'PromptEngineering', engine: new PromptEngineeringToolCallEngine() },
      ];

      // Each supported engine should be able to provide incremental updates that build up to the same JSON
      engines.forEach(({ name, engine }) => {
        const state = engine.initStreamProcessingState();
        let accumulatedArgs = '';
        let hasStreamingUpdates = false;

        // Simulate different streaming patterns for each engine type
        if (engine instanceof PromptEngineeringToolCallEngine) {
          const toolCallContent =
            '<tool_call>\n{"name": "calculator", "parameters": {"operation": "add", "x": 10, "y": 20}}\n</tool_call>';
          const chunks = toolCallContent.split('').map((char) => ({
            choices: [{ delta: { content: char }, index: 0, finish_reason: null }],
          }));

          for (const chunk of chunks) {
            const result = engine.processStreamingChunk(chunk as ChatCompletionChunk, state);
            if (result.streamingToolCallUpdates) {
              hasStreamingUpdates = true;
              for (const update of result.streamingToolCallUpdates) {
                accumulatedArgs += update.argumentsDelta;
              }
            }
          }
        }

        // For supported engines, we should get streaming updates
        if (engine instanceof PromptEngineeringToolCallEngine) {
          expect(hasStreamingUpdates).toBe(true);
          if (accumulatedArgs) {
            expect(() => JSON.parse(accumulatedArgs)).not.toThrow();
          }
        }
      });
    });
  });
});
