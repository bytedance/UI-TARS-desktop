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

describe('T5 processStreamingChunk', () => {
  let state: T5StreamProcessingState;

  beforeEach(() => {
    state = createT5InitState();
  });

  describe('T5 think tag parsing', () => {
    it('should parse complete T5 think tag in single chunk', () => {
      const chunk = createChunk(
        `<${think_token}>Great! I can see that the search bar is now active</${think_token}>`,
      );
      const result = processStreamingChunk(chunk, state);

      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('Great! I can see that the search bar is now active');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should parse partial T5 think tag across multiple chunks', () => {
      // First chunk: opening tag and partial content
      const chunk1 = createChunk(`<${think_token}>Great! I can see that the`);
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('Great! I can see that the');

      // Second chunk: more content
      const chunk2 = createChunk(' search bar is now');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe(' search bar is now');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now');

      // Third chunk: closing tag
      const chunk3 = createChunk(` active</${think_token}>`);
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('');
      expect(result3.reasoningContent).toBe(' active');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should handle partial T5 think opening tag', () => {
      // First chunk: partial opening tag
      const partialTag = `<${think_token.substring(0, 6)}`; // Use first 6 chars of think_token
      const chunk1 = createChunk(partialTag);
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('');
      expect(state.reasoningBuffer).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('');

      // Second chunk: complete opening tag and content
      const remainingTag = think_token.substring(6);
      const chunk2 = createChunk(`${remainingTag}>This is thinking content</${think_token}>`);
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe('This is thinking content');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('This is thinking content');
    });
  });

  describe('T5 chat content parsing', () => {
    it('should parse chat content outside of tags', () => {
      const chunk = createChunk('你好！很高兴见到你。有什么我可以帮助你的吗？');
      const result = processStreamingChunk(chunk, state);

      expect(result.content).toBe('你好！很高兴见到你。有什么我可以帮助你的吗？');
      expect(result.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe(
        '你好！很高兴见到你。有什么我可以帮助你的吗？',
      );
      expect(state.reasoningBuffer).toBe('');
    });

    it('should parse chat content after think tag', () => {
      // First chunk: think tag
      const chunk1 = createChunk(`<${think_token}>thinking</${think_token}>`);
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.reasoningContent).toBe('thinking');
      expect(result1.content).toBe('');

      // Second chunk: chat content
      const chunk2 = createChunk('Hello world!');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('Hello world!');
      expect(result2.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('Hello world!');
      expect(state.reasoningBuffer).toBe('thinking');
    });

    it('should parse chat content across multiple chunks', () => {
      // First chunk: opening tag and partial content
      const chunk1 = createChunk(`<${think_token}>thinking</${think_token}>你好！很高兴`);
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('你好！很高兴');
      expect(result1.reasoningContent).toBe('thinking');
      expect(state.accumulatedChatContentBuffer).toBe('你好！很高兴');
      expect(state.reasoningBuffer).toBe('thinking');

      // Second chunk: more content
      const chunk2 = createChunk('见到你。有什么我可以');
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('见到你。有什么我可以');
      expect(result2.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('你好！很高兴见到你。有什么我可以');
      expect(state.reasoningBuffer).toBe('thinking');

      // Third chunk: closing tag
      const chunk3 = createChunk('帮助你的吗？');
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('帮助你的吗？');
      expect(result3.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe(
        '你好！很高兴见到你。有什么我可以帮助你的吗？',
      );
      expect(state.reasoningBuffer).toBe('thinking');
    });

    it('should parse think followed by answer', () => {
      // chunk1
      const chunk1 = createChunk(`<${think_token}>用户向我打招呼说"你好啊"，`);
      const result1 = processStreamingChunk(chunk1, state);
      expect(result1.content).toBe('');
      expect(result1.reasoningContent).toBe('用户向我打招呼说"你好啊"，');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，');

      // chunk2
      const partialCloseTag = `</${think_token.substring(0, 2)}`; // Use first 2 chars for partial close
      const chunk2 = createChunk(`这是一个简单的中文问候。${partialCloseTag}`);
      const result2 = processStreamingChunk(chunk2, state);
      expect(result2.content).toBe('');
      expect(result2.reasoningContent).toBe('这是一个简单的中文问候。');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

      // chunk3
      const remainingCloseTag = think_token.substring(2) + '>';
      const chunk3 = createChunk(remainingCloseTag);
      const result3 = processStreamingChunk(chunk3, state);
      expect(result3.content).toBe('');
      expect(result3.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

      // chunk4
      const chunk4 = createChunk('你好！很高');
      const result4 = processStreamingChunk(chunk4, state);
      expect(result4.content).toBe('你好！很高');
      expect(result4.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('你好！很高');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');

      // chunk5
      const chunk5 = createChunk('兴见到你。');
      const result5 = processStreamingChunk(chunk5, state);
      expect(result5.content).toBe('兴见到你。');
      expect(result5.reasoningContent).toBe('');
      expect(state.accumulatedChatContentBuffer).toBe('你好！很高兴见到你。');
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
    });
  });

  describe('real-world scenarios from samples', () => {
    it('should handle resp1.jsonl pattern correctly with incremental reasoning updates', () => {
      // Simulate the streaming chunks from resp1.jsonl
      const strs = [
        '<',
        think_token,
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
        `</${think_token}>`,
        'h',
        'ere ',
        'am i',
      ];

      for (let i = 0; i < strs.length; i++) {
        const result = processStreamingChunk(createChunk(strs[i]), state);
        if (i === 3) {
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe('Great');
          expect(state.accumulatedChatContentBuffer).toBe('');
          expect(state.reasoningBuffer).toBe('Great');
        }

        if (i === 5) {
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe(' I');
          expect(state.accumulatedChatContentBuffer).toBe('');
          expect(state.reasoningBuffer).toBe('Great! I');
        }

        if (i === 16) {
          expect(result.content).toBe('h');
          expect(result.reasoningContent).toBe('');
          expect(state.accumulatedChatContentBuffer).toBe('h');
          expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
        }

        if (i === strs.length - 1) {
          expect(result.content).toBe('am i');
          expect(result.reasoningContent).toBe('');
          expect(state.accumulatedChatContentBuffer).toBe('here am i');
          expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
        }
      }

      expect(state.accumulatedChatContentBuffer).toBe('here am i');
      expect(state.reasoningBuffer).toBe('Great! I can see that the search bar is now active');
    });

    it('should handle resp2.jsonl pattern correctly with incremental updates', () => {
      // Simulate the streaming chunks from resp2.jsonl
      const strs = [
        '<',
        think_token,
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
        `</${think_token}>`,
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
      ];

      for (const str of strs) {
        processStreamingChunk(createChunk(str), state);
      }

      expect(state.accumulatedChatContentBuffer).toBe(
        '\n你好！很高兴见到你。有什么我可以帮助你的吗？\n',
      );
      expect(state.reasoningBuffer).toBe('用户向我打招呼说"你好啊"，这是一个简单的中文问候。');
    });
  });

  describe('T5 mixed content scenarios', () => {
    it('should parse think + chat content', () => {
      const chunk = createChunk(
        `<${think_token}>User is asking for help</${think_token}>\nHello! How can I assist you today?`,
      );
      const result = processStreamingChunk(chunk, state);

      expect(result.reasoningContent).toBe('User is asking for help');
      expect(result.content).toBe('\nHello! How can I assist you today?');
      expect(state.reasoningBuffer).toBe('User is asking for help');
      expect(state.accumulatedChatContentBuffer).toBe('\nHello! How can I assist you today?');
    });

    it('should parse think + tool call', () => {
      const content = `<${think_token}>I need to call a function</${think_token}>
<seed:tool_call>
    <function=test_function>
        <parameter=param1>test_value</parameter>
    </function>
</seed:tool_call>`;

      const chunk = createChunk(content);
      const result = processStreamingChunk(chunk, state);

      expect(result.reasoningContent).toBe('I need to call a function');
      expect(result.hasToolCallUpdate).toBe(true);
      expect(result.content).toBe('');
      expect(state.toolCalls).toHaveLength(1);
      expect(state.toolCalls[0].function.name).toBe('test_function');
      expect(state.accumulatedChatContentBuffer).toBe('');
    });

    it('should parse think + chat content + tool call', () => {
      const content = `<${think_token}>User needs assistance, I should help and call a function</${think_token}>
I'd be happy to help you!
<seed:tool_call>
    <function=assistance_function>
        <parameter=message>providing help</parameter>
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
      expect(state.toolCalls).toHaveLength(1);
      expect(state.toolCalls[0].function.name).toBe('assistance_function');
    });
  });

  describe('T5 streaming behavior', () => {
    it('should handle character-by-character streaming', () => {
      const content = `<${think_token}>thinking</${think_token}>final answer here`;

      // Stream character by character
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const result = processStreamingChunk(createChunk(char), state);

        // Check some key points
        if (i === content.indexOf('thinking') + 7) {
          // End of 'thinking'
          expect(result.content).toBe('');
          expect(result.reasoningContent).toBe('g');
        }
      }

      expect(state.reasoningBuffer).toBe('thinking');
      expect(state.accumulatedChatContentBuffer).toBe('final answer here');
    });

    it('should handle partial tag scenarios correctly', () => {
      // Partial think tag
      const partialOpenTag = `<${think_token.substring(0, 2)}`;
      let result = processStreamingChunk(createChunk(partialOpenTag), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');

      // add content
      const middleTag = think_token.substring(2, 4);
      result = processStreamingChunk(createChunk(middleTag), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');

      const remainingOpenTag = think_token.substring(4) + '>content';
      result = processStreamingChunk(createChunk(remainingOpenTag), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('content');

      // Partial closing tag
      const partialCloseTag = `</${think_token.substring(0, 4)}`;
      result = processStreamingChunk(createChunk(partialCloseTag), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');

      // Complete closing tag
      const remainingCloseTag = think_token.substring(4) + '>';
      result = processStreamingChunk(createChunk(remainingCloseTag), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
      expect(state.reasoningBuffer).toBe('content');
      expect(state.accumulatedChatContentBuffer).toBe('');
    });
  });

  describe('T5 edge cases', () => {
    it('should handle empty chunks', () => {
      const result = processStreamingChunk(createChunk(''), state);
      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
      expect(result.hasToolCallUpdate).toBe(false);
    });
  });
});
