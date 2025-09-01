/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createT5InitState,
  processT5StreamingChunk as processStreamingChunk,
  T5StreamProcessingState,
} from '../index';
import { ChatCompletionChunk, StreamingToolCallUpdate } from '@tarko/agent-interface';
import { realStreamingChunks } from '../data/testData';
import { think_token } from '../../../environments/prompt_t5';

export function createChunk(content: string, finish_reason = ''): ChatCompletionChunk {
  return { choices: [{ delta: { content }, finish_reason }] } as unknown as ChatCompletionChunk;
}

describe('processStreamingChunk', () => {
  let state: T5StreamProcessingState;

  beforeEach(() => {
    state = createT5InitState();
  });

  describe('Multiple tool call parsing', () => {
    it('should parse multiple functions in tool call', () => {
      const toolCallChunk = `<seed:tool_call>
    <function=function_1>
        <parameter=param_1>value_1</parameter>
    </function>
    <function=function_2>
        <parameter=param_2>value_2</parameter>
    </function>
</seed:tool_call>`;

      const chunk = createChunk(toolCallChunk);
      const result = processStreamingChunk(chunk, state);

      expect(result.hasToolCallUpdate).toBe(true);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
      expect(state.toolCalls).toHaveLength(2);
      expect(state.toolCalls[0].function.name).toBe('function_1');
      expect(state.toolCalls[1].function.name).toBe('function_2');
      expect(JSON.parse(state.toolCalls[0].function.arguments)).toEqual({ param_1: 'value_1' });
      expect(JSON.parse(state.toolCalls[1].function.arguments)).toEqual({ param_2: 'value_2' });
    });

    it('should parse think + chat content + multiple tool call', () => {
      const content = `<${think_token}>User needs assistance, I should help and call a function</${think_token}>
I'd be happy to help you!
<seed:tool_call>
    <function=function_1>
        <parameter=param_1>value_1</parameter>
    </function>
    <function=function_2>
        <parameter=param_2>value_2</parameter>
    </function>
</seed:tool_call>`;

      const chunk = createChunk(content);
      const result = processStreamingChunk(chunk, state);

      expect(result.reasoningContent).toBe(
        'User needs assistance, I should help and call a function',
      );

      expect(result.content).toBe("\nI'd be happy to help you!\n");
      expect(state.accumulatedChatContentBuffer).toBe("\nI'd be happy to help you!\n");
      expect(result.hasToolCallUpdate).toBe(true);
      expect(state.toolCalls).toHaveLength(2);
      expect(state.toolCalls[0].function.name).toBe('function_1');
      expect(state.toolCalls[1].function.name).toBe('function_2');
      expect(JSON.parse(state.toolCalls[0].function.arguments)).toEqual({ param_1: 'value_1' });
      expect(JSON.parse(state.toolCalls[1].function.arguments)).toEqual({ param_2: 'value_2' });
    });
  });
});
