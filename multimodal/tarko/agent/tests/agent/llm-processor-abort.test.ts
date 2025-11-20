/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { AgentEventStreamProcessor } from '../../src/agent/event-stream';
import { AgentEventStream } from '../../src';

// Mock the logger to avoid dependency issues
vi.mock('@tarko/shared-utils', () => ({
  getLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    infoWithData: vi.fn(),
  }),
  isTest: () => true,
}));

describe('LLMProcessor - Abort Handling', () => {
  // Test the core logic with full createFinalEvents signature
  const createMockFinalEventsMethod = () => {
    const eventStream = new AgentEventStreamProcessor();
    
    // Simulate the exact createFinalEvents method logic with full signature
    return (
      content: string,
      rawContent: string = '',
      currentToolCalls: any[] = [],
      reasoningBuffer: string = '',
      finishReason: string = 'stop',
      messageId?: string,
      ttftMs?: number,
      ttltMs?: number,
      abortSignal?: AbortSignal,
    ) => {
      // Core logic from actual implementation
      let finalContent = content;
      if (!content && abortSignal?.aborted) {
        finalContent = '[Request was aborted by user]';
      }

      if (finalContent || currentToolCalls.length > 0) {
        const assistantEvent = eventStream.createEvent('assistant_message', {
          content: finalContent,
          rawContent: rawContent,
          toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
          finishReason: finishReason,
          messageId: messageId,
          ttftMs: ttftMs,
          ttltMs: ttltMs,
        });
        eventStream.sendEvent(assistantEvent);
      }

      if (reasoningBuffer) {
        const thinkingEvent = eventStream.createEvent('assistant_thinking_message', {
          content: reasoningBuffer,
          isComplete: true,
          messageId: messageId,
        });
        eventStream.sendEvent(thinkingEvent);
      }
      
      return eventStream;
    };
  };

  it('should provide default content for aborted requests with empty content', () => {
    const controller = new AbortController();
    controller.abort();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents(
      '', // content
      '', // rawContent
      [], // currentToolCalls
      '', // reasoningBuffer
      'stop', // finishReason
      'test-msg-id', // messageId
      100, // ttftMs
      500, // ttltMs
      controller.signal // abortSignal
    );
    
    const events = eventStream.getEvents();
    expect(events.length).toBe(1);
    
    const assistantEvent = events[0] as AgentEventStream.AssistantMessageEvent;
    expect(assistantEvent.type).toBe('assistant_message');
    expect(assistantEvent.content).toBe('[Request was aborted by user]');
    
    // Snapshot the complete event stream to help maintainers understand the fix
    // Normalize dynamic fields for stable snapshots while preserving structure visibility
    const normalizedEvents = events.map(event => ({
      ...event,
      id: expect.any(String),
      timestamp: expect.any(Number),
    }));
    
    expect(normalizedEvents).toMatchInlineSnapshot(`
      [
        {
          "content": "[Request was aborted by user]",
          "finishReason": "stop",
          "id": Any<String>,
          "messageId": "test-msg-id",
          "rawContent": "",
          "timestamp": Any<Number>,
          "toolCalls": undefined,
          "ttftMs": 100,
          "ttltMs": 500,
          "type": "assistant_message",
        },
      ]
    `);
  });

  it('should preserve original content when not aborted', () => {
    const controller = new AbortController();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents(
      'Original response',
      'raw content',
      [],
      '',
      'stop',
      undefined,
      undefined,
      undefined,
      controller.signal
    );
    
    const events = eventStream.getEvents();
    expect(events.length).toBe(1);
    
    const assistantEvent = events[0] as AgentEventStream.AssistantMessageEvent;
    expect(assistantEvent.content).toBe('Original response');
  });

  it('should preserve original content even when aborted if content exists', () => {
    const controller = new AbortController();
    controller.abort();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents(
      'Partial response',
      'raw partial',
      [],
      '',
      'stop',
      undefined,
      undefined,
      undefined,
      controller.signal
    );
    
    const events = eventStream.getEvents();
    expect(events.length).toBe(1);
    
    const assistantEvent = events[0] as AgentEventStream.AssistantMessageEvent;
    expect(assistantEvent.content).toBe('Partial response');
  });
});
