/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChatCompletionChunk } from '@tarko/agent-interface';
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitState, processStreamingChunk, OmniStreamProcessingState } from '../index';

function chunker(content: string, finish_reason = '') {
  return { choices: [{ delta: { content }, finish_reason }] } as unknown as ChatCompletionChunk;
}

describe('processStreamingChunk', () => {
  let state: OmniStreamProcessingState;

  beforeEach(() => {
    state = createInitState();
  });

  describe('think tag parsing', () => {
    it('should parse complete think tag in single chunk', () => {
      const chunk = chunker('<think>Great! I can see that the search bar is now active</think>');
      const result = processStreamingChunk(chunk, state);

      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('Great! I can see that the search bar is now active');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should parse partial think tag across multiple chunks', () => {
      // First chunk: opening tag and partial content
      const chunk1 = chunker('<think>Great! I can see that the');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('Great! I can see that the');

      // Second chunk: more content
      const chunk2 = chunker(' search bar is now');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe(' search bar is now');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now');

      // Third chunk: closing tag
      const chunk3 = chunker(' active</think>');
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('');
      expect(result3.reasoningContent).toBe(' active');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should handle partial opening tag', () => {
      // First chunk: partial opening tag - characters are ignored since no complete tag
      const chunk1 = chunker('<thi');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('');
      expect(state.reasoningBuffer).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('');

      // Second chunk: complete opening tag and content
      const chunk2 = chunker('nk>This is thinking content</think>');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe('This is thinking content');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('This is thinking content');
    });
  });

  describe('answer tag parsing', () => {
    it('should parse complete answer tag in single chunk', () => {
      const chunk = chunker('<answer>你好！很高兴见到你。有什么我可以帮助你的吗？</answer>');
      const result = processStreamingChunk(chunk, state);

      expect(result.content).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
      expect(result.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
      expect(state.reasoningBuffer).toBe('');
    });

    it('should parse partial answer tag across multiple chunks', () => {
      // First chunk: opening tag and partial content
      const chunk1 = chunker('<answer>你好！很高兴');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('你好！很高兴');
      expect(result1.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('你好！很高兴');
      expect(state.reasoningBuffer).toBe('');

      // Second chunk: more content
      const chunk2 = chunker('见到你。有什么我可以');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('见到你。有什么我可以');
      expect(result2.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('你好！很高兴见到你。有什么我可以');
      expect(state.reasoningBuffer).toBe('');

      // Third chunk: closing tag
      const chunk3 = chunker('帮助你的吗？</answer>');
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('帮助你的吗？');
      expect(result3.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
      expect(state.reasoningBuffer).toBe('');
    });
  });

  describe('mixed think and answer tags', () => {
    it('should parse think followed by answer', () => {
      // chunk1
      const chunk1 = chunker('<think>用户向我打招呼说"你好啊"，');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('用户向我打招呼说"你好啊"，');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，');

      // chunk2
      const chunk2 = chunker('这是一个简单的中文问候。</think>');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe('这是一个简单的中文问候。');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

      // chunk3
      const chunk3 = chunker('<answer>你好！很高兴见到你。</answer>');
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('你好！很高兴见到你。');
      expect(result3.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('你好！很高兴见到你。');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
    });

    it('should handle interleaved tags correctly', () => {
      // Think tag first
      const chunk1 = chunker('<think>Analyzing the request</think>');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.reasoningContent).toBe('Analyzing the request');
      expect(result1.content).toBe('');

      // Then answer tag
      const chunk2 = chunker('<answer>Here is my response</answer>');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('Here is my response');
      expect(result2.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('Here is my response');
      expect(state.reasoningBuffer).toBe('Analyzing the request');
    });
  });

  describe('edge cases', () => {
    it('should handle empty chunks', () => {
      const result = processStreamingChunk(chunker(''), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
    });

    it('should handle chunks without tags', () => {
      const result = processStreamingChunk(chunker('plain text without tags'), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
    });

    it('should handle incomplete closing tags', () => {
      // Start with think tag
      const chunk1 = chunker('<think>some content</thi');
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('some content');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('some content');

      // Complete the closing tag
      const chunk2 = chunker('nk>');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe('');
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('some content');
    });
  });

  describe('real-world scenarios from samples', () => {
    it('should handle resp1.jsonl pattern correctly with incremental reasoning updates', () => {
      // Simulate the streaming chunks from resp1.jsonl
      const strs = [
        '<',
        'think',
        '>',
        'Great',
        '!',
        ' I',
        ' can',
        ' see',
        ' that',
        ' the',
        ' search',
        ' bar',
        ' is',
        ' now',
        ' active',
        '</think>',
        '<ans',
        'wer>h',
        'ere ',
        'am i</a',
        'nswer>',
      ];

      for (let i = 0; i < strs.length; i++) {
        const result = processStreamingChunk(chunker(strs[i]), state);
        if (i === 3) {
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe('Great');
          expect(state.accumulatedAnswerBuffer).toBe('');
          expect(state.reasoningBuffer).toBe('Great');
        }

        if (i === 5) {
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe(' I');
          expect(state.accumulatedAnswerBuffer).toBe('');
          expect(state.reasoningBuffer).toBe('Great! I');
        }

        if (i === 16) {
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe('');
          expect(state.accumulatedAnswerBuffer).toBe('');
          expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
        }

        if (i === strs.length - 2) {
          expect(result.content).toBe('am i');
          expect(result.reasoningContent).toBe('');
          expect(state.accumulatedAnswerBuffer).toBe('here am i');
          expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
        }
      }

      expect(state.accumulatedAnswerBuffer).toBe('here am i');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should handle resp2.jsonl pattern correctly with incremental updates', () => {
      // Simulate the streaming chunks from resp2.jsonl
      const strs = [
        '<',
        'think',
        '>',
        '用户',
        '向',
        '我',
        '打招呼',
        '说',
        '"',
        '你',
        '好',
        '啊',
        '"',
        '，',
        '这',
        '是',
        '一个',
        '简单',
        '的',
        '中文',
        '问候',
        '。',
        '</think>',
        '\n',
        '<',
        'answer',
        '>',
        '\n',
        '你',
        '好',
        '！',
        '很高兴',
        '见到',
        '你',
        '。',
        '有',
        '什么',
        '我',
        '可以',
        '帮助',
        '你的',
        '吗',
        '？',
        '\n',
        '</answer>',
      ];

      for (const str of strs) {
        processStreamingChunk(chunker(str), state);
      }

      expect(state.accumulatedAnswerBuffer).toBe(
        '\n你好！很高兴见到你。有什么我可以帮助你的吗？\n',
      );
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
    });
  });
});
