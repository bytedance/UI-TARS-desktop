/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChatCompletionChunk } from '@tarko/agent-interface';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createT5InitState,
  processT5StreamingChunk as processStreamingChunk,
  T5StreamProcessingState,
} from '../index';
import { think_token } from '../../../environments/prompt_t5';

function createChunk(content: string, finish_reason = '') {
  return { choices: [{ delta: { content }, finish_reason }] } as unknown as ChatCompletionChunk;
}

describe('Dynamic think_token pattern generation', () => {
  let state: T5StreamProcessingState;

  beforeEach(() => {
    state = createT5InitState();
  });

  describe(`Current think_token configuration: ${think_token}`, () => {
    it('should handle complete tag in single chunk', () => {
      const chunk = createChunk(`<${think_token}>test content</${think_token}>`);
      const result = processStreamingChunk(chunk, state);
      
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('test content');
      expect(state.reasoningBuffer).toBe('test content');
    });

    it('should handle partial opening tag at various breakpoints', () => {
      // Test at different meaningful breakpoints based on token length
      const breakpoints = [
        1, 
        Math.floor(think_token.length / 4),
        Math.floor(think_token.length / 2),
        Math.floor(think_token.length * 3 / 4),
        think_token.length - 1
      ].filter(bp => bp > 0 && bp < think_token.length);
      
      for (const breakpoint of breakpoints) {
        const testState = createT5InitState();
        const partial = `<${think_token.substring(0, breakpoint)}`;
        
        const chunk1 = createChunk(partial);
        const result1 = processStreamingChunk(chunk1, testState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('');
        
        // Complete the tag
        const remaining = think_token.substring(breakpoint) + '>content</' + think_token + '>';
        const chunk2 = createChunk(remaining);
        const result2 = processStreamingChunk(chunk2, testState);
        expect(result2.reasoningContent).toBe('content');
        expect(testState.reasoningBuffer).toBe('content');
      }
    });

    it('should handle partial closing tag at various breakpoints', () => {
      // First establish think content
      const openChunk = createChunk(`<${think_token}>thinking content`);
      processStreamingChunk(openChunk, state);
      
      // Test partial closing tag breakpoints
      const closeTag = `</${think_token}>`;
      const breakpoints = [
        1, 
        Math.floor(closeTag.length / 2),
        closeTag.length - 1
      ].filter(bp => bp > 0 && bp < closeTag.length);
      
      for (const breakpoint of breakpoints) {
        const testState = createT5InitState();
        
        // Re-establish the think content
        processStreamingChunk(createChunk(`<${think_token}>thinking content`), testState);
        
        const partial = closeTag.substring(0, breakpoint);
        const chunk1 = createChunk(partial);
        const result1 = processStreamingChunk(chunk1, testState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('');
        
        // Complete the closing tag
        const remaining = closeTag.substring(breakpoint);
        const chunk2 = createChunk(remaining);
        const result2 = processStreamingChunk(chunk2, testState);
        expect(result2.content).toBe('');
        expect(result2.reasoningContent).toBe('');
        expect(testState.reasoningBuffer).toBe('thinking content');
        expect(testState.thinkParseCompleted).toBe(true);
      }
    });

    it('should handle character-by-character streaming', () => {
      const content = `<${think_token}>thinking</${think_token}>final answer`;
      
      // Stream character by character
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        processStreamingChunk(createChunk(char), state);
      }
      
      expect(state.reasoningBuffer).toBe('thinking');
      expect(state.accumulatedChatContentBuffer).toBe('final answer');
      expect(state.thinkParseCompleted).toBe(true);
    });

    it('should handle very small partial chunks (single character)', () => {
      const fullContent = `<${think_token}>step by step thinking</${think_token}>final result`;
      
      // Process one character at a time
      for (const char of fullContent) {
        processStreamingChunk(createChunk(char), state);
      }
      
      expect(state.reasoningBuffer).toBe('step by step thinking');
      expect(state.accumulatedChatContentBuffer).toBe('final result');
      expect(state.thinkParseCompleted).toBe(true);
    });

    it('should handle mixed content with think, chat, and tool calls', () => {
      const content = `<${think_token}>I need to help the user</${think_token}>
Hello! I'll help you with that.

<seed:tool_call>
<function=test_function>
<parameter=param1>value1</parameter>
</function>
</seed:tool_call>`;

      const chunk = createChunk(content);
      const result = processStreamingChunk(chunk, state);
      
      expect(result.reasoningContent).toBe('I need to help the user');
      expect(result.content).toBe('\nHello! I\'ll help you with that.\n\n');
      expect(result.hasToolCallUpdate).toBe(true);
      expect(state.reasoningBuffer).toBe('I need to help the user');
    });
  });

  describe('Pattern generation robustness', () => {
    it('should generate correct number of partial patterns', () => {
      // This test verifies our pattern generation logic
      const expectedPatternCount = think_token.length + 1; // +1 for '<'
      
      // We can't directly test the internal function, but we can test behavior
      // by trying various partial matches
      const testCases = [];
      for (let i = 1; i <= think_token.length; i++) {
        testCases.push(`<${think_token.substring(0, i)}`);
      }
      
      // Each of these should be recognized as partial matches
      for (const partialTag of testCases) {
        const testState = createT5InitState();
        const chunk = createChunk(partialTag);
        const result = processStreamingChunk(chunk, testState);
        
        // Should not produce content or reasoning (waiting for completion)
        expect(result.content).toBe('');
        expect(result.reasoningContent).toBe('');
        
        // The buffer should preserve the partial tag for next chunk
        expect(testState.thinkBuffer).toBe(partialTag);
      }
    });
  });
});