/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextCompressionManager,
  SlidingWindowStrategy,
  ToolResultCompressionStrategy,
  ImageCompressionStrategy,
  SimpleTokenEstimator,
} from '../../src/context-compression';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';

describe('Context Compression', () => {
  let compressionManager: ContextCompressionManager;
  let tokenEstimator: SimpleTokenEstimator;

  beforeEach(() => {
    tokenEstimator = new SimpleTokenEstimator();
  });

  describe('SimpleTokenEstimator', () => {
    it('should estimate text tokens correctly', () => {
      const text = 'Hello, world!';
      const tokens = tokenEstimator.estimateTextTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be more efficient than 1 char = 1 token
    });

    it('should estimate image tokens', () => {
      const imageData = { width: 512, height: 512 };
      const tokens = tokenEstimator.estimateImageTokens(imageData);
      expect(tokens).toBeGreaterThan(100); // Images should cost significant tokens
    });

    it('should estimate message tokens', () => {
      const message: ChatCompletionMessageParam = {
        role: 'user',
        content: 'Hello, how are you today?',
      };
      const tokens = tokenEstimator.estimateMessageTokens(message);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('SlidingWindowStrategy', () => {
    it('should not compress when under threshold', () => {
      const strategy = new SlidingWindowStrategy(5);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const context = {
        currentTokens: 50,
        maxTokens: 1000,
        iteration: 1,
        sessionId: 'test',
        events: [],
      };

      const result = strategy.compress(messages, context);
      expect(result.wasCompressed).toBe(false);
      expect(result.messages).toEqual(messages);
    });

    it('should compress when over threshold', () => {
      const strategy = new SlidingWindowStrategy(2, true);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
      ];

      const context = {
        currentTokens: 850,
        maxTokens: 1000,
        iteration: 1,
        sessionId: 'test',
        events: [],
      };

      const result = strategy.compress(messages, context);
      expect(result.wasCompressed).toBe(true);
      expect(result.messages.length).toBeLessThan(messages.length);
      // Should preserve system prompt
      expect(result.messages[0].role).toBe('system');
      // Should keep only the last 2 messages plus system
      expect(result.messages.length).toBe(3); // system + 2 recent messages
    });
  });

  describe('ToolResultCompressionStrategy', () => {
    it('should compress large tool results', () => {
      const strategy = new ToolResultCompressionStrategy(100, 0.5);
      const largeResult = 'x'.repeat(1000); // Large tool result
      
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Get some data' },
        { role: 'assistant', content: 'I\'ll get that data for you.', tool_calls: [] },
        { role: 'tool', content: largeResult, tool_call_id: 'call_123' },
      ];

      const context = {
        currentTokens: 750,
        maxTokens: 1000,
        iteration: 1,
        sessionId: 'test',
        events: [],
      };

      const result = strategy.compress(messages, context);
      expect(result.wasCompressed).toBe(true);
      
      // Find the tool message
      const toolMessage = result.messages.find(m => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage!.content).toContain('[Content truncated for context management]');
      expect((toolMessage!.content as string).length).toBeLessThan(largeResult.length);
    });
  });

  describe('ImageCompressionStrategy', () => {
    it('should compress images when over limit', () => {
      const strategy = new ImageCompressionStrategy(1, true);
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at these images:' },
            { type: 'image_url', image_url: { url: 'image1.jpg' } },
            { type: 'image_url', image_url: { url: 'image2.jpg' } },
          ],
        },
      ];

      const context = {
        currentTokens: 650,
        maxTokens: 1000,
        iteration: 1,
        sessionId: 'test',
        events: [],
      };

      const result = strategy.compress(messages, context);
      expect(result.wasCompressed).toBe(true);
      
      // Check that some images were replaced with text placeholders
      const userMessage = result.messages.find(m => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(Array.isArray(userMessage!.content)).toBe(true);
      
      const content = userMessage!.content as any[];
      const textParts = content.filter(part => part.type === 'text');
      const imageParts = content.filter(part => part.type === 'image_url');
      
      expect(imageParts.length).toBeLessThan(2); // Should have fewer images
      expect(textParts.some(part => part.text.includes('[Image omitted to conserve context]'))).toBe(true);
    });
  });

  describe('ContextCompressionManager', () => {
    beforeEach(() => {
      compressionManager = new ContextCompressionManager({
        enabled: true,
        level: 'moderate',
        maxContextTokens: 1000,
        compressionThreshold: 0.8,
        targetCompressionRatio: 0.6,
      });
    });

    it('should not compress when under threshold', async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];

      const result = await compressionManager.compressIfNeeded(
        messages,
        'test-session',
        1,
        []
      );

      expect(result.wasCompressed).toBe(false);
      expect(result.messages).toEqual(messages);
    });

    it('should apply multiple strategies when over threshold', async () => {
      // Create messages that will trigger compression
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
      ];

      // Add many messages to exceed threshold
      for (let i = 0; i < 20; i++) {
        messages.push(
          { role: 'user', content: `User message ${i} with some content to increase token count` },
          { role: 'assistant', content: `Assistant response ${i} with detailed explanation and more content` },
        );
      }

      // Add large tool result
      messages.push({
        role: 'tool',
        content: JSON.stringify({ data: 'x'.repeat(1000) }),
        tool_call_id: 'call_123',
      });

      // Add images
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Here are some images:' },
          { type: 'image_url', image_url: { url: 'image1.jpg' } },
          { type: 'image_url', image_url: { url: 'image2.jpg' } },
          { type: 'image_url', image_url: { url: 'image3.jpg' } },
        ],
      });

      const result = await compressionManager.compressIfNeeded(
        messages,
        'test-session',
        1,
        []
      );

      expect(result.wasCompressed).toBe(true);
      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.stats.appliedStrategies.length).toBeGreaterThan(0);
      expect(result.stats.compressionRatio).toBeLessThan(1.0);
      expect(result.stats.compressedTokens).toBeLessThan(result.stats.originalTokens);
    });

    it('should support different compression levels', () => {
      const conservativeManager = new ContextCompressionManager({
        level: 'conservative',
        maxContextTokens: 1000,
      });

      const aggressiveManager = new ContextCompressionManager({
        level: 'aggressive',
        maxContextTokens: 1000,
      });

      const conservativeOptions = conservativeManager.getOptions();
      const aggressiveOptions = aggressiveManager.getOptions();

      expect(conservativeOptions.level).toBe('conservative');
      expect(aggressiveOptions.level).toBe('aggressive');
    });

    it('should support custom strategies', () => {
      const customStrategy = new SlidingWindowStrategy(5, true);
      const customManager = new ContextCompressionManager({
        customStrategies: [customStrategy],
      });

      expect(customManager.getOptions().customStrategies).toContain(customStrategy);
    });

    it('should be disabled when enabled is false', async () => {
      const disabledManager = new ContextCompressionManager({
        enabled: false,
      });

      const messages: ChatCompletionMessageParam[] = [];
      // Add many messages that would normally trigger compression
      for (let i = 0; i < 50; i++) {
        messages.push(
          { role: 'user', content: `Message ${i}` },
          { role: 'assistant', content: `Response ${i}` },
        );
      }

      const result = await disabledManager.compressIfNeeded(
        messages,
        'test-session',
        1,
        []
      );

      expect(result.wasCompressed).toBe(false);
      expect(result.messages).toEqual(messages);
    });
  });
});
