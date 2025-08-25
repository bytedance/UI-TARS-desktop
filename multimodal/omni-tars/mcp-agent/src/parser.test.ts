/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createInitState, parseStreamingChunk, OmniStreamProcessingState } from './parser';

describe('streamingParser', () => {
  let tagState: OmniStreamProcessingState;

  beforeEach(() => {
    tagState = createInitState();
  });

  describe('createTagState', () => {
    it('should create initial tag state', () => {
      const state = createInitState();
      expect(state).toEqual({
        contentBuffer: '',
        toolCalls: [],
        reasoningBuffer: '',
        finishReason: null,
        lastParsedContent: '',
        currentTag: null,
        insideTag: false,
        tagContent: '',
        thinkBuffer: '',
        answerBuffer: '',
        pendingBuffer: '',
        partialTag: '',
        answerReturnMode: null,
      });
    });
  });

  describe('parseStreamingChunk', () => {
    describe('think tag parsing', () => {
      it('should parse complete think tag in single chunk', () => {
        const chunk = '<think>Great! I can see that the search bar is now active</think>';
        const result = parseStreamingChunk(chunk, tagState);

        expect(result.content).toBe('');
        expect(result.reasoningContent).toBe('Great! I can see that the search bar is now active');
        expect(tagState.thinkBuffer).toBe('Great! I can see that the search bar is now active');
        expect(tagState.insideTag).toBe(false);
        expect(tagState.currentTag).toBe(null);
      });

      it('should parse partial think tag across multiple chunks', () => {
        // First chunk: opening tag and partial content
        const chunk1 = '<think>Great! I can see that the';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('Great! I can see that the');
        expect(tagState.insideTag).toBe(true);
        expect(tagState.currentTag).toBe('think');
        expect(tagState.tagContent).toBe('Great! I can see that the');

        // Second chunk: more content
        const chunk2 = ' search bar is now';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('');
        expect(result2.reasoningContent).toBe('Great! I can see that the search bar is now');
        expect(tagState.tagContent).toBe('Great! I can see that the search bar is now');

        // Third chunk: closing tag
        const chunk3 = ' active</think>';
        const result3 = parseStreamingChunk(chunk3, tagState);
        expect(result3.content).toBe('');
        expect(result3.reasoningContent).toBe('Great! I can see that the search bar is now active');
        expect(tagState.thinkBuffer).toBe('Great! I can see that the search bar is now active');
        expect(tagState.insideTag).toBe(false);
        expect(tagState.currentTag).toBe(null);
      });

      it('should handle partial opening tag', () => {
        // First chunk: partial opening tag - characters are ignored since no complete tag
        const chunk1 = '<thi';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('');
        expect(tagState.insideTag).toBe(false);

        // Second chunk: complete opening tag and content
        const chunk2 = 'nk>This is thinking content</think>';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('');
        expect(result2.reasoningContent).toBe('This is thinking content');
        expect(tagState.thinkBuffer).toBe('This is thinking content');
      });
    });

    describe('answer tag parsing', () => {
      it('should parse complete answer tag in single chunk', () => {
        const chunk = '<answer>你好！很高兴见到你。有什么我可以帮助你的吗？</answer>';
        const result = parseStreamingChunk(chunk, tagState);

        expect(result.content).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
        expect(result.reasoningContent).toBe('');
        expect(tagState.answerBuffer).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
        expect(tagState.insideTag).toBe(false);
        expect(tagState.currentTag).toBe(null);
      });

      it('should parse partial answer tag across multiple chunks', () => {
        // First chunk: opening tag and partial content
        const chunk1 = '<answer>你好！很高兴';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('你好！很高兴');
        expect(result1.reasoningContent).toBe('');
        expect(tagState.insideTag).toBe(true);
        expect(tagState.currentTag).toBe('answer');

        // Second chunk: more content
        const chunk2 = '见到你。有什么我可以';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('你好！很高兴见到你。有什么我可以');
        expect(result2.reasoningContent).toBe('');

        // Third chunk: closing tag
        const chunk3 = '帮助你的吗？</answer>';
        const result3 = parseStreamingChunk(chunk3, tagState);
        expect(result3.content).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
        expect(result3.reasoningContent).toBe('');
        expect(tagState.answerBuffer).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
      });
    });

    describe('mixed think and answer tags', () => {
      it('should parse think followed by answer', () => {
        // First chunk: think tag
        const chunk1 = '<think>用户向我打招呼说"你好啊"，这是一个简单的中文问候。</think>';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

        // Second chunk: answer tag
        const chunk2 = '<answer>你好！很高兴见到你。</answer>';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('你好！很高兴见到你。');
        expect(result2.reasoningContent).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

        expect(tagState.thinkBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
        expect(tagState.answerBuffer).toBe('你好！很高兴见到你。');
      });

      it('should handle interleaved tags correctly', () => {
        // Think tag first
        const chunk1 = '<think>Analyzing the request</think>';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.reasoningContent).toBe('Analyzing the request');

        // Then answer tag
        const chunk2 = '<answer>Here is my response</answer>';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('Here is my response');
        expect(result2.reasoningContent).toBe('Analyzing the request');
      });
    });

    describe('edge cases', () => {
      it('should handle empty chunks', () => {
        const result = parseStreamingChunk('', tagState);
        expect(result.content).toBe('');
        expect(result.reasoningContent).toBe('');
      });

      it('should handle chunks without tags', () => {
        const result = parseStreamingChunk('plain text without tags', tagState);
        expect(result.content).toBe('');
        expect(result.reasoningContent).toBe('');
      });

      it('should handle incomplete closing tags', () => {
        // Start with think tag
        const chunk1 = '<think>some content</thi';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('');
        expect(result1.reasoningContent).toBe('some content'); // Should return incremental content
        expect(tagState.insideTag).toBe(true);
        expect(tagState.tagContent).toBe('some content');

        // Complete the closing tag
        const chunk2 = 'nk>';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe('');
        expect(result2.reasoningContent).toBe('some content');
        expect(tagState.insideTag).toBe(false);
      });

      it('should handle malformed tags gracefully', () => {
        const chunk = '<think>content<answer>more content</think>';
        const result = parseStreamingChunk(chunk, tagState);
        expect(result.content).toBe('');
        expect(result.reasoningContent).toBe('content<answer>more content');
        expect(tagState.thinkBuffer).toBe('content<answer>more content');
      });

      it('should handle nested same tags', () => {
        const chunk = '<think>outer<think>inner</think>content</think>';
        const result = parseStreamingChunk(chunk, tagState);
        // Should treat the first </think> as closing the outer tag
        expect(result.reasoningContent).toBe('outer<think>inner');
        expect(tagState.thinkBuffer).toBe('outer<think>inner');
      });
    });

    describe('real-world scenarios from samples', () => {
      it('should handle resp1.jsonl pattern correctly with incremental reasoning updates', () => {
        // Simulate the streaming chunks from resp1.jsonl
        const chunks = [
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
          // ... more content would continue
          '.',
          '</think>',
        ];

        let accumulatedContent = '';
        const reasoningContentUpdates: string[] = [];

        for (const chunk of chunks) {
          const result = parseStreamingChunk(chunk, tagState);
          accumulatedContent += result.content;
          if (result.reasoningContent) {
            reasoningContentUpdates.push(result.reasoningContent);
          }
        }

        expect(accumulatedContent).toBe('');
        expect(reasoningContentUpdates.length).toBeGreaterThan(1); // Should have multiple updates
        expect(reasoningContentUpdates[reasoningContentUpdates.length - 1]).toBe(
          'Great! I can see that the search bar is now active.',
        );
        expect(tagState.thinkBuffer).toBe('Great! I can see that the search bar is now active.');
      });

      it('should handle resp2.jsonl pattern correctly with incremental updates', () => {
        // Simulate the streaming chunks from resp2.jsonl
        const chunks = [
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

        let accumulatedContent = '';
        const reasoningContentUpdates: string[] = [];
        const answerContentUpdates: string[] = [];

        for (const chunk of chunks) {
          const result = parseStreamingChunk(chunk, tagState);
          accumulatedContent += result.content;
          if (result.reasoningContent) {
            reasoningContentUpdates.push(result.reasoningContent);
          }
          if (result.content) {
            answerContentUpdates.push(accumulatedContent);
          }
        }

        expect(accumulatedContent).toBe('\n你好！很高兴见到你。有什么我可以帮助你的吗？\n');
        expect(reasoningContentUpdates.length).toBeGreaterThan(1); // Should have multiple updates for think content
        expect(reasoningContentUpdates[reasoningContentUpdates.length - 1]).toBe(
          '用户向我打招呼说"你好啊"，这是一个简单的中文问候。',
        );
        expect(tagState.thinkBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
        expect(tagState.answerBuffer).toBe('\n你好！很高兴见到你。有什么我可以帮助你的吗？\n');
      });
    });

    describe('incremental streaming behavior', () => {
      it('should provide real-time reasoning content updates during think tag processing', () => {
        // Test incremental think content streaming
        const chunk1 = '<think>I need to';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.reasoningContent).toBe('I need to');

        const chunk2 = ' analyze this';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.reasoningContent).toBe('I need to analyze this');

        const chunk3 = ' carefully.</think>';
        const result3 = parseStreamingChunk(chunk3, tagState);
        expect(result3.reasoningContent).toBe('I need to analyze this carefully.');

        // Verify thinkBuffer is updated correctly
        expect(tagState.thinkBuffer).toBe('I need to analyze this carefully.');
      });

      it('should provide real-time answer content updates during answer tag processing', () => {
        // Test incremental answer content streaming
        const chunk1 = '<answer>Hello';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.content).toBe('Hello');

        const chunk2 = ' there';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.content).toBe(' there');

        const chunk3 = '!</answer>';
        const result3 = parseStreamingChunk(chunk3, tagState);
        expect(result3.content).toBe('!');

        // Verify answerBuffer is updated correctly
        expect(tagState.answerBuffer).toBe('Hello there!');
      });

      it('should maintain reasoning content across chunks even when not actively updating', () => {
        // First establish some think content
        const chunk1 = '<think>Initial thought</think>';
        const result1 = parseStreamingChunk(chunk1, tagState);
        expect(result1.reasoningContent).toBe('Initial thought');

        // Process non-think content - should still return previous reasoning
        const chunk2 = 'some random text';
        const result2 = parseStreamingChunk(chunk2, tagState);
        expect(result2.reasoningContent).toBe('Initial thought');
        expect(result2.content).toBe('');
      });
    });
  });
});
