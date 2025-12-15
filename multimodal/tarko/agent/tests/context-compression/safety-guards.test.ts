/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextSafetyGuards } from '../../src/context-compression/safety-guards';
import { SimpleTokenCounter } from '../../src/context-compression/token-counter';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';

describe('ContextSafetyGuards', () => {
  let safetyGuards: ContextSafetyGuards;
  let tokenCounter: SimpleTokenCounter;

  beforeEach(() => {
    tokenCounter = new SimpleTokenCounter('gpt-4o', 1000); // Small context for testing
    safetyGuards = new ContextSafetyGuards(tokenCounter);
  });

  describe('validateContextSize', () => {
    it('should validate messages within limits', async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello' },
      ];

      const result = await safetyGuards.validateContextSize(messages);
      
      expect(result.isValid).toBe(true);
      expect(result.currentTokens).toBeGreaterThan(0);
      expect(result.exceedsBy).toBeUndefined();
    });

    it('should detect oversized context', async () => {
      const largeContent = 'x'.repeat(5000); // Very large content
      const messages: ChatCompletionMessageParam[] = [
        { role: 'user', content: largeContent },
      ];

      const result = await safetyGuards.validateContextSize(messages, 0.1);
      
      expect(result.isValid).toBe(false);
      expect(result.exceedsBy).toBeGreaterThan(0);
    });
  });

  describe('checkOversizedMessage', () => {
    it('should detect oversized single message', async () => {
      const largeContent = 'x'.repeat(2000);
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: largeContent,
      };

      const result = await safetyGuards.checkOversizedMessage(message);
      
      expect(result.isOversized).toBe(true);
      expect(result.tokens).toBeGreaterThan(result.maxAllowed);
    });

    it('should pass normal-sized messages', async () => {
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: 'Hello, how are you?',
      };

      const result = await safetyGuards.checkOversizedMessage(message);
      
      expect(result.isOversized).toBe(false);
      expect(result.tokens).toBeLessThanOrEqual(result.maxAllowed);
    });
  });

  describe('preprocessMessages', () => {
    it('should truncate oversized messages', async () => {
      const largeContent = 'x'.repeat(2000);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: largeContent },
        { role: 'user', content: 'Normal message' },
      ];

      const result = await safetyGuards.preprocessMessages(messages);
      
      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('You are helpful.'); // System unchanged
      expect(result[1].content).toContain('[truncated for context limit]'); // User truncated
      expect(result[2].content).toBe('Normal message'); // Normal unchanged
    });

    it('should handle multimodal content', async () => {
      const largeText = 'x'.repeat(2000);
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: largeText },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
          ],
        },
      ];

      const result = await safetyGuards.preprocessMessages(messages);
      
      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0].content)).toBe(true);
      const content = result[0].content as any[];
      expect(content[0].text).toContain('[truncated for context limit]');
    });
  });

  describe('emergencyCompress', () => {
    it('should perform emergency compression', async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second question' },
        { role: 'assistant', content: 'Second answer' },
        { role: 'user', content: 'Third question' },
      ];

      const result = await safetyGuards.emergencyCompress(messages, 1000);
      
      expect(result.length).toBeLessThan(messages.length);
      
      // Should preserve system message
      const systemMessages = result.filter(msg => msg.role === 'system');
      expect(systemMessages).toHaveLength(1);
      
      // Should preserve last user message
      const userMessages = result.filter(msg => msg.role === 'user');
      expect(userMessages.length).toBeGreaterThanOrEqual(1);
      const lastUserMessage = userMessages[userMessages.length - 1];
      expect(lastUserMessage.content).toBe('Third question');
    });

    it('should handle oversized system message', async () => {
      const largeSystemContent = 'System instruction: ' + 'x'.repeat(1000);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: largeSystemContent },
        { role: 'user', content: 'Question' },
      ];

      const result = await safetyGuards.emergencyCompress(messages, 1000);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // System message should be truncated
      const systemMessage = result.find(msg => msg.role === 'system');
      if (systemMessage) {
        expect(systemMessage.content).toContain('[truncated for context limit]');
      }
    });

    it('should handle case with no user messages', async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'assistant', content: 'Hello!' },
      ];

      const result = await safetyGuards.emergencyCompress(messages, 1000);
      
      expect(result.length).toBeGreaterThanOrEqual(1);
      
      // Should at least preserve system message
      const systemMessages = result.filter(msg => msg.role === 'system');
      expect(systemMessages).toHaveLength(1);
    });
  });

  describe('truncateMessage', () => {
    it('should truncate string content', async () => {
      const largeContent = 'x'.repeat(1000);
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: largeContent,
      };

      // Use reflection to access private method for testing
      const truncated = await (safetyGuards as any).truncateMessage(message, 100);
      
      expect(typeof truncated.content).toBe('string');
      expect((truncated.content as string).length).toBeLessThan(largeContent.length);
      expect(truncated.content).toContain('[truncated for context limit]');
    });

    it('should truncate multimodal content', async () => {
      const largeText = 'x'.repeat(1000);
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: [
          { type: 'text', text: largeText },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
        ],
      };

      const truncated = await (safetyGuards as any).truncateMessage(message, 100);
      
      expect(Array.isArray(truncated.content)).toBe(true);
      const content = truncated.content as any[];
      expect(content[0].text).toContain('[truncated for context limit]');
    });

    it('should not truncate content within limits', async () => {
      const normalContent = 'This is a normal message';
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: normalContent,
      };

      const truncated = await (safetyGuards as any).truncateMessage(message, 1000);
      
      expect(truncated.content).toBe(normalContent);
    });
  });
});
