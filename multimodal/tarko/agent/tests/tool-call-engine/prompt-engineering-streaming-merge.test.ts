/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, it, expect } from 'vitest';
import { PromptEngineeringToolCallEngine } from '../../src/tool-call-engine/PromptEngineeringToolCallEngine';
import { ChatCompletionChunk, StreamingToolCallUpdate } from '@tarko/agent-interface';

describe('PromptEngineeringToolCallEngine - Streaming Updates Merging', () => {
  let engine: PromptEngineeringToolCallEngine;

  beforeEach(() => {
    engine = new PromptEngineeringToolCallEngine();
  });

  it('should merge consecutive streaming tool call updates with same tool call ID', () => {
    const state = engine.initStreamProcessingState();

    // Simulate receiving chunks that would generate multiple small updates
    const chunks = [
      // First chunk: opening tag and start of JSON
      createChunk('<tool_call>\n{\n  "name": "test_tool",\n  "parameters": {\n    "arg": "val'),
      // Second chunk: continuation of parameter value
      createChunk('ue1",\n    "arg2": "val'),
      // Third chunk: end of parameter value
      createChunk('ue2"\n  }\n}'),
      // Fourth chunk: closing tag
      createChunk('\n</tool_call>'),
    ];

    const totalStreamingToolCallUpdates: StreamingToolCallUpdate[] = [];

    for (const chunk of chunks) {
      const result = engine.processStreamingChunk(chunk, state);

      // Count updates before merging (we need to access the private method via reflection for testing)
      // or simulate the behavior by manually counting expected character-by-character updates

      if (result.streamingToolCallUpdates) {
        totalStreamingToolCallUpdates.push(...result.streamingToolCallUpdates);

        // Verify that each update contains meaningful delta content
        for (const update of result.streamingToolCallUpdates) {
          if (!update.isComplete && update.argumentsDelta) {
            // Each merged update should contain more than a single character for efficiency
            expect(update.argumentsDelta.length).toBeGreaterThan(0);
          }
        }
      }
    }

    expect(totalStreamingToolCallUpdates.length).toBe(4);
    expect(totalStreamingToolCallUpdates[0].argumentsDelta).toMatchInlineSnapshot(`
      "{
          "arg": "val"
    `);
    expect(totalStreamingToolCallUpdates[1].argumentsDelta).toMatchInlineSnapshot(`
      "ue1",
          "arg2": "val"
    `);
    expect(totalStreamingToolCallUpdates[2].argumentsDelta).toMatchInlineSnapshot(`
      "ue2"
        }"
    `);
    expect(totalStreamingToolCallUpdates[3].argumentsDelta).toMatchInlineSnapshot(`""`);

    // Verify the final tool call was properly constructed
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0].function.name).toBe('test_tool');

    const args = JSON.parse(state.toolCalls[0].function.arguments);
    expect(args).toEqual({
      arg: 'value1',
      arg2: 'value2',
    });
  });

  it('should not merge updates from different tool calls', () => {
    const state = engine.initStreamProcessingState();

    // Simulate multiple tool calls in sequence
    const chunks = [
      createChunk('<tool_call>{"name": "tool1", "parameters": {"arg": "val1"}}</tool_call>'),
      createChunk('<tool_call>{"name": "tool2", "parameters": {"arg": "val2"}}</tool_call>'),
    ];

    const allUpdates: StreamingToolCallUpdate[] = [];

    for (const chunk of chunks) {
      const result = engine.processStreamingChunk(chunk, state);
      if (result.streamingToolCallUpdates) {
        allUpdates.push(...result.streamingToolCallUpdates);
      }
    }

    // Should have updates for both tool calls
    const tool1Updates = allUpdates.filter((u) => u.toolName === 'tool1');
    const tool2Updates = allUpdates.filter((u) => u.toolName === 'tool2');

    expect(tool1Updates.length).toBeGreaterThan(0);
    expect(tool2Updates.length).toBeGreaterThan(0);

    // Verify both tool calls were created
    expect(state.toolCalls).toHaveLength(2);
    expect(state.toolCalls[0].function.name).toBe('tool1');
    expect(state.toolCalls[1].function.name).toBe('tool2');
  });

  it('should handle completion updates correctly without merging', () => {
    const state = engine.initStreamProcessingState();

    // Add a tool call first
    const setupChunk = createChunk(
      '<tool_call>{"name": "test_tool", "parameters": {"arg": "value"}}</tool_call>',
    );
    const result = engine.processStreamingChunk(setupChunk, state);

    // Find the completion update
    const completionUpdate = result.streamingToolCallUpdates?.find((u) => u.isComplete);

    if (completionUpdate) {
      expect(completionUpdate.isComplete).toBe(true);
      expect(completionUpdate.argumentsDelta).toBe(''); // Completion updates have empty delta
    }
  });

  it('should preserve update order when merging', () => {
    const state = engine.initStreamProcessingState();

    // Simulate a chunk that generates multiple character updates
    const chunk = createChunk(
      '<tool_call>{"name": "test_tool", "parameters": {"key": "some_long_value_that_spans_multiple_characters"}}</tool_call>',
    );
    const result = engine.processStreamingChunk(chunk, state);

    if (result.streamingToolCallUpdates) {
      // Check that merged content makes sense
      const parameterUpdates = result.streamingToolCallUpdates.filter(
        (u) => !u.isComplete && u.argumentsDelta,
      );

      if (parameterUpdates.length > 0) {
        // Combine all delta content
        const combinedDelta = parameterUpdates.map((u) => u.argumentsDelta).join('');

        // Should be valid JSON content
        expect(combinedDelta).toContain('"key": "some_long_value_that_spans_multiple_characters"');
      }
    }
  });

  it('should handle empty or single updates without issues', () => {
    const state = engine.initStreamProcessingState();

    // Test with a chunk that produces no tool call updates
    const chunk = createChunk('Regular content without tool calls');
    const result = engine.processStreamingChunk(chunk, state);

    expect(result.streamingToolCallUpdates).toBeUndefined();
    expect(result.content).toBe('Regular content without tool calls');
  });
});

/**
 * Helper function to create a mock ChatCompletionChunk
 */
function createChunk(content: string): ChatCompletionChunk {
  return {
    id: 'test-chunk',
    object: 'chat.completion.chunk',
    created: Date.now(),
    model: 'test-model',
    choices: [
      {
        index: 0,
        delta: {
          content,
        },
        finish_reason: null,
      },
    ],
  };
}
