/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageHistory } from '../../src/agent/message-history';
import { AgentEventStreamProcessor } from '../../src/agent/event-stream';
import { NativeToolCallEngine } from '../../src/tool-call-engine';
import { AgentEventStream, ContextCompressionOptions } from '@tarko/agent-interface';

describe('MessageHistory with Context Compression', () => {
  let eventStream: AgentEventStreamProcessor;
  let nativeEngine: NativeToolCallEngine;
  const defaultSystemPrompt = 'You are a helpful assistant that can use provided tools.';

  beforeEach(() => {
    eventStream = new AgentEventStreamProcessor();
    nativeEngine = new NativeToolCallEngine();
  });

  describe('Context compression integration', () => {
    it('should apply compression when configured', async () => {
      const compressionOptions: ContextCompressionOptions = {
        enabled: true,
        level: 'moderate',
        maxContextTokens: 500, // Low limit to trigger compression
        compressionThreshold: 0.5,
        targetCompressionRatio: 0.4,
      };

      const messageHistory = new MessageHistory(
        eventStream,
        undefined, // No legacy maxImagesCount
        compressionOptions,
      );

      // Create many events to exceed the token limit
      const events: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: Date.now(),
          content: 'Hello, I need help with multiple tasks today.',
        },
      ];

      // Add many assistant messages and tool results to increase token count
      for (let i = 0; i < 10; i++) {
        events.push(
          {
            id: `assistant-${i}`,
            type: 'assistant_message',
            timestamp: Date.now() + i * 1000,
            content: `This is a detailed assistant response number ${i} with lots of content to increase the token count significantly. I'm providing comprehensive information about various topics and explaining things in great detail to ensure the context becomes large enough to trigger compression mechanisms.`,
            finishReason: 'stop',
          },
          {
            id: `tool-result-${i}`,
            type: 'tool_result',
            timestamp: Date.now() + i * 1000 + 500,
            toolCallId: `call-${i}`,
            name: 'getData',
            content: `Large tool result ${i}: ${'x'.repeat(200)}`, // Large content
            elapsedMs: 100,
          },
        );
      }

      // Add events to stream
      events.forEach(event => eventStream.sendEvent(event));

      // Get message history with compression
      const messages = await messageHistory.toMessageHistory(
        nativeEngine,
        defaultSystemPrompt,
        [],
        'test-session',
        1,
      );

      // Should have fewer messages due to compression
      expect(messages.length).toBeLessThan(events.length + 1); // +1 for system message
      
      // Should still have system message
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('You are a helpful assistant');
    });

    it('should not compress when disabled', async () => {
      const compressionOptions: ContextCompressionOptions = {
        enabled: false,
      };

      const messageHistory = new MessageHistory(
        eventStream,
        undefined,
        compressionOptions,
      );

      // Add some events
      const events: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: Date.now(),
          content: 'Hello',
        },
        {
          id: 'assistant-1',
          type: 'assistant_message',
          timestamp: Date.now() + 1000,
          content: 'Hi there!',
          finishReason: 'stop',
        },
      ];

      events.forEach(event => eventStream.sendEvent(event));

      const messages = await messageHistory.toMessageHistory(
        nativeEngine,
        defaultSystemPrompt,
        [],
        'test-session',
        1,
      );

      // Should have all messages (system + 2 events)
      expect(messages.length).toBe(3);
    });

    it('should work with legacy maxImagesCount parameter', async () => {
      const messageHistory = new MessageHistory(
        eventStream,
        2, // Legacy parameter
      );

      // Add events with images
      const events: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: Date.now(),
          content: [
            { type: 'text', text: 'Look at these images:' },
            { type: 'image_url', image_url: { url: 'image1.jpg' } },
            { type: 'image_url', image_url: { url: 'image2.jpg' } },
            { type: 'image_url', image_url: { url: 'image3.jpg' } },
          ],
        },
      ];

      events.forEach(event => eventStream.sendEvent(event));

      const messages = await messageHistory.toMessageHistory(
        nativeEngine,
        defaultSystemPrompt,
        [],
        'test-session',
        1,
      );

      // Should have system message + user message
      expect(messages.length).toBe(2);
      
      // Check that images were limited
      const userMessage = messages.find(m => m.role === 'user');
      expect(userMessage).toBeDefined();
      expect(Array.isArray(userMessage!.content)).toBe(true);
      
      const content = userMessage!.content as any[];
      const imageParts = content.filter(part => part.type === 'image_url');
      const textParts = content.filter(part => part.type === 'text');
      
      // Should have limited images and placeholder text
      expect(imageParts.length).toBeLessThanOrEqual(2);
      expect(textParts.some(part => part.text && part.text.includes('[Image omitted to conserve context]'))).toBe(true);
    });

    it('should work without compression options', async () => {
      const messageHistory = new MessageHistory(eventStream);

      const events: AgentEventStream.Event[] = [
        {
          id: 'user-1',
          type: 'user_message',
          timestamp: Date.now(),
          content: 'Hello',
        },
      ];

      events.forEach(event => eventStream.sendEvent(event));

      const messages = await messageHistory.toMessageHistory(
        nativeEngine,
        defaultSystemPrompt,
      );

      expect(messages.length).toBe(2); // system + user
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
    });
  });
});
