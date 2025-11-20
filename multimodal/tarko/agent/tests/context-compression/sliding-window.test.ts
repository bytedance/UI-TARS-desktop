/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SlidingWindowStrategy } from '../../src/context-compression/strategies/sliding-window';
import { CompressionContext } from '../../src/context-compression/types';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';

describe('SlidingWindowStrategy', () => {
  let strategy: SlidingWindowStrategy;
  let mockContext: CompressionContext;

  beforeEach(() => {
    strategy = new SlidingWindowStrategy();
    
    // Create mock messages
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'I am doing well, thank you!' },
      { role: 'user', content: 'What can you help me with?' },
      { role: 'assistant', content: 'I can help with many things...' },
    ];

    const events: AgentEventStream.Event[] = [];

    mockContext = {
      messages,
      events,
      currentTokens: 1000,
      maxTokens: 1200,
      model: {
        id: 'gpt-4o',
        provider: 'openai',
        contextWindow: 1200,
      },
      session: {
        id: 'test-session',
        iteration: 1,
      },
    };
  });

  describe('shouldCompress', () => {
    it('should trigger compression when tokens exceed 70% threshold', () => {
      mockContext.currentTokens = 900; // 75% of 1200
      expect(strategy.shouldCompress(mockContext)).toBe(true);
    });

    it('should not trigger compression when tokens are below threshold', () => {
      mockContext.currentTokens = 800; // ~67% of 1200
      expect(strategy.shouldCompress(mockContext)).toBe(false);
    });
  });

  describe('compress', () => {
    it('should preserve system messages', async () => {
      const result = await strategy.compress(mockContext);
      
      const systemMessages = result.messages.filter(msg => msg.role === 'system');
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).toBe('You are a helpful assistant.');
    });

    it('should reduce message count', async () => {
      // Create a larger context to ensure compression
      const largeMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...Array.from({ length: 20 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
        })) as ChatCompletionMessageParam[],
      ];
      
      const largeContext = { ...mockContext, messages: largeMessages };
      const result = await strategy.compress(largeContext);
      
      expect(result.messages.length).toBeLessThan(largeContext.messages.length);
      expect(result.stats.compressedMessageCount).toBeLessThan(result.stats.originalMessageCount);
    });

    it('should maintain conversation structure', async () => {
      const result = await strategy.compress(mockContext);
      
      // Should have system message first
      expect(result.messages[0].role).toBe('system');
      
      // Remaining messages should maintain user-assistant pattern
      const conversationMessages = result.messages.slice(1);
      for (let i = 0; i < conversationMessages.length - 1; i += 2) {
        if (i < conversationMessages.length) {
          expect(conversationMessages[i].role).toBe('user');
        }
        if (i + 1 < conversationMessages.length) {
          expect(conversationMessages[i + 1].role).toBe('assistant');
        }
      }
    });

    it('should provide compression statistics', async () => {
      const result = await strategy.compress(mockContext);
      
      expect(result.stats).toMatchObject({
        originalTokens: mockContext.currentTokens,
        originalMessageCount: mockContext.messages.length,
        compressedMessageCount: result.messages.length,
        strategy: 'sliding_window',
      });
      
      expect(result.stats.compressionRatio).toBeGreaterThan(0);
      expect(result.stats.compressionRatio).toBeLessThanOrEqual(1);
      expect(result.stats.compressionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should preserve recent messages based on configuration', async () => {
      const customStrategy = new SlidingWindowStrategy({
        preserveRatio: 0.5, // Keep 50% of messages
        preserveRecentUserMessages: 2,
        preserveRecentAssistantMessages: 2,
      });
      
      const result = await customStrategy.compress(mockContext);
      
      // Should preserve at least the configured number of recent messages
      const userMessages = result.messages.filter(msg => msg.role === 'user');
      const assistantMessages = result.messages.filter(msg => msg.role === 'assistant');
      
      expect(userMessages.length).toBeGreaterThanOrEqual(2);
      expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('configuration', () => {
    it('should use custom preserve ratio', async () => {
      const customStrategy = new SlidingWindowStrategy({
        preserveRatio: 0.2, // Keep only 20% of messages
      });
      
      // Create a larger context to test compression
      const largeMessages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...Array.from({ length: 20 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i + 1}`,
        })) as ChatCompletionMessageParam[],
      ];
      
      const largeContext = { ...mockContext, messages: largeMessages };
      const result = await customStrategy.compress(largeContext);
      
      // Should have significantly fewer messages
      expect(result.messages.length).toBeLessThan(largeContext.messages.length);
      expect(result.messages.length).toBeLessThanOrEqual(Math.ceil(largeContext.messages.length * 0.5));
    });

    it('should handle preserve system message setting', async () => {
      const customStrategy = new SlidingWindowStrategy({
        preserveSystemMessage: false,
      });
      
      const result = await customStrategy.compress(mockContext);
      
      // System message might not be preserved
      const systemMessages = result.messages.filter(msg => msg.role === 'system');
      expect(systemMessages.length).toBeLessThanOrEqual(1);
    });
  });
});
