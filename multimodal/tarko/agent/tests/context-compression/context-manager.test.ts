/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../../src/context-compression/context-manager';
import { CompressionTrigger } from '../../src/context-compression/types';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let mockMessages: ChatCompletionMessageParam[];
  let mockEvents: AgentEventStream.Event[];

  beforeEach(() => {
    contextManager = new ContextManager({
      enabled: true,
      strategy: 'sliding_window',
      compressionThreshold: 0.7,
      targetCompressionRatio: 0.3,
      minMessagesToKeep: 5,
      maxCompressionAttempts: 10,
    }, 'gpt-4o', 'openai');

    mockMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' },
      { role: 'assistant', content: 'I am doing well, thank you!' },
    ];

    mockEvents = [];
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultManager = new ContextManager();
      const config = defaultManager.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.strategy).toBe('sliding_window');
      expect(config.compressionThreshold).toBe(0.7);
    });

    it('should merge custom configuration with defaults', () => {
      const config = contextManager.getConfig();
      
      expect(config.compressionThreshold).toBe(0.7);
      expect(config.targetCompressionRatio).toBe(0.3);
      expect(config.minMessagesToKeep).toBe(5);
    });

    it('should update configuration', () => {
      contextManager.updateConfig({
        compressionThreshold: 0.8,
        strategy: 'structured_summary',
      });
      
      const config = contextManager.getConfig();
      expect(config.compressionThreshold).toBe(0.8);
      expect(config.strategy).toBe('structured_summary');
    });
  });

  describe('shouldCompress', () => {
    it('should return false when compression is disabled', async () => {
      contextManager.updateConfig({ enabled: false });
      
      const result = await contextManager.shouldCompress(
        mockMessages,
        mockEvents,
        'test-session',
        1
      );
      
      expect(result.shouldCompress).toBe(false);
    });

    it('should check compression attempts limit', async () => {
      // Set a very low limit
      contextManager.updateConfig({ maxCompressionAttempts: 0 });
      
      const result = await contextManager.shouldCompress(
        mockMessages,
        mockEvents,
        'test-session',
        1
      );
      
      expect(result.shouldCompress).toBe(false);
    });

    it('should return token count information', async () => {
      const result = await contextManager.shouldCompress(
        mockMessages,
        mockEvents,
        'test-session',
        1
      );
      
      expect(result.currentTokens).toBeGreaterThan(0);
      expect(typeof result.currentTokens).toBe('number');
    });
  });

  describe('compress', () => {
    it('should throw error when compression is disabled', async () => {
      contextManager.updateConfig({ enabled: false });
      
      await expect(
        contextManager.compress(mockMessages, mockEvents, 'test-session', 1)
      ).rejects.toThrow('Compression is disabled');
    });

    it('should perform compression successfully', async () => {
      // Create a scenario that would trigger compression
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} with some content that takes up space`,
      })) as ChatCompletionMessageParam[];
      
      const result = await contextManager.compress(
        longMessages,
        mockEvents,
        'test-session',
        1
      );
      
      expect(result.messages.length).toBeLessThan(longMessages.length);
      expect(result.stats.strategy).toBe('sliding_window');
      expect(result.stats.compressionRatio).toBeGreaterThan(0);
    });

    it('should record compression history', async () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
      })) as ChatCompletionMessageParam[];
      
      await contextManager.compress(
        longMessages,
        mockEvents,
        'test-session',
        1
      );
      
      const history = contextManager.getCompressionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].sessionId).toBe('test-session');
      expect(history[0].iteration).toBe(1);
    });

    it('should support manual compression', async () => {
      const result = await contextManager.manualCompress(
        mockMessages,
        mockEvents,
        'test-session',
        1
      );
      
      expect(result.stats.strategy).toBe('sliding_window');
      
      const history = contextManager.getCompressionHistory();
      expect(history[0].trigger).toBe(CompressionTrigger.MANUAL);
    });
  });

  describe('statistics', () => {
    it('should provide empty statistics initially', () => {
      const stats = contextManager.getCompressionStats();
      
      expect(stats.totalCompressions).toBe(0);
      expect(stats.averageCompressionRatio).toBe(0);
      expect(stats.totalTokensSaved).toBe(0);
    });

    it('should calculate statistics after compressions', async () => {
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
      })) as ChatCompletionMessageParam[];
      
      // Perform multiple compressions
      await contextManager.compress(longMessages, mockEvents, 'session-1', 1);
      await contextManager.compress(longMessages, mockEvents, 'session-2', 1);
      
      const stats = contextManager.getCompressionStats();
      
      expect(stats.totalCompressions).toBe(2);
      expect(stats.averageCompressionRatio).toBeGreaterThan(0);
      expect(stats.totalTokensSaved).toBeGreaterThan(0);
      expect(stats.strategyUsage['sliding_window']).toBe(2);
    });

    it('should clear history', () => {
      contextManager.clearHistory();
      
      const stats = contextManager.getCompressionStats();
      expect(stats.totalCompressions).toBe(0);
      
      const history = contextManager.getCompressionHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('context information', () => {
    it('should provide context window information', async () => {
      const info = await contextManager.getContextInfo(mockMessages);
      
      expect(info.currentTokens).toBeGreaterThan(0);
      expect(info.maxTokens).toBeGreaterThan(0);
      expect(info.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(info.usagePercentage).toBeLessThanOrEqual(1);
      expect(info.compressionThreshold).toBe(0.7);
      expect(typeof info.needsCompression).toBe('boolean');
    });

    it('should estimate token count', async () => {
      const tokenCount = await contextManager.estimateTokens(mockMessages);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(typeof tokenCount).toBe('number');
    });
  });

  describe('model updates', () => {
    it('should update model information', () => {
      contextManager.updateModel('gpt-3.5-turbo', 'openai');
      
      // Should not throw and should work with new model
      expect(() => contextManager.getTokenCounter()).not.toThrow();
    });
  });
});
