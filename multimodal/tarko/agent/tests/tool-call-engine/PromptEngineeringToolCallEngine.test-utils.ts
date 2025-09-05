/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi } from 'vitest';
import { Tool, z, ChatCompletionChunk } from './../../src';

// Mock logger
vi.mock('../utils/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

/**
 * Create a simple test tool with string parameter
 */
export function createSimpleTestTool(id: string = 'testTool') {
  return new Tool({
    id,
    description: 'A test tool',
    parameters: z.object({
      param: z.string().describe('A test parameter'),
      optionalParam: z.number().optional().describe('An optional parameter'),
    }),
    function: async () => 'test result',
  });
}

/**
 * Create a tool with JSON schema parameters
 */
export function createJSONSchemaTool() {
  return new Tool({
    id: 'jsonTool',
    description: 'JSON schema tool',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'User name',
        },
        age: {
          type: 'number',
          description: 'User age',
        },
      },
      required: ['name'],
    },
    function: async () => 'json result',
  });
}

/**
 * Create multiple test tools for testing
 */
export function createMultipleTestTools() {
  return [
    new Tool({
      id: 'tool1',
      description: 'First tool',
      parameters: z.object({
        param1: z.string().describe('First parameter'),
      }),
      function: async () => 'result 1',
    }),
    new Tool({
      id: 'tool2',
      description: 'Second tool',
      parameters: z.object({
        param2: z.boolean().describe('Second parameter'),
      }),
      function: async () => 'result 2',
    }),
  ];
}

/**
 * Create a chat completion chunk for testing
 */
export function createChatCompletionChunk(
  content: string,
  finishReason: string | null = null
): ChatCompletionChunk {
  return {
    id: 'chunk-1',
    choices: [
      {
        delta: { content },
        index: 0,
        finish_reason: finishReason,
      },
    ],
    created: Date.now(),
    model: 'claude-3-5-sonnet',
    object: 'chat.completion.chunk',
  };
}

/**
 * Create a reasoning content chunk for testing
 */
export function createReasoningChunk(reasoningContent: string): ChatCompletionChunk {
  return {
    id: 'chunk-1',
    choices: [
      {
        // @ts-expect-error Testing non-standard reasoning_content field
        delta: { reasoning_content: reasoningContent },
        index: 0,
        finish_reason: null,
      },
    ],
    created: Date.now(),
    model: 'claude-3-5-sonnet',
    object: 'chat.completion.chunk',
  };
}

/**
 * Convert a string to individual character chunks for streaming simulation
 */
export function stringToChunks(content: string): ChatCompletionChunk[] {
  return content.split('').map((char) => createChatCompletionChunk(char));
}

/**
 * Process multiple chunks through the engine and return accumulated results
 */
export function processChunksSequentially(
  engine: any,
  chunks: ChatCompletionChunk[],
  state: any
) {
  let accumulatedContent = '';
  let accumulatedReasoningContent = '';
  let hasToolCallUpdate = false;
  const toolCallUpdates: any[] = [];

  for (const chunk of chunks) {
    const result = engine.processStreamingChunk(chunk, state);
    accumulatedContent += result.content;
    accumulatedReasoningContent += result.reasoningContent;

    if (result.hasToolCallUpdate && result.streamingToolCallUpdates) {
      hasToolCallUpdate = true;
      toolCallUpdates.push(...result.streamingToolCallUpdates);
    }
  }

  return {
    accumulatedContent,
    accumulatedReasoningContent,
    hasToolCallUpdate,
    toolCallUpdates,
  };
}
