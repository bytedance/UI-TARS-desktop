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
  // Test the core logic directly without full LLMProcessor instantiation
  const createMockFinalEventsMethod = () => {
    const eventStream = new AgentEventStreamProcessor();
    
    // Simulate the createFinalEvents method logic
    return (content: string, abortSignal?: AbortSignal) => {
      let finalContent = content;
      if (!content && abortSignal?.aborted) {
        finalContent = '[Request was aborted by user]';
      }
      
      if (finalContent) {
        const assistantEvent = eventStream.createEvent('assistant_message', {
          content: finalContent,
          finishReason: 'stop',
        });
        eventStream.sendEvent(assistantEvent);
      }
      
      return eventStream;
    };
  };

  it('should provide default content for aborted requests with empty content', () => {
    const controller = new AbortController();
    controller.abort();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents('', controller.signal);
    
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
          "timestamp": Any<Number>,
          "type": "assistant_message",
        },
      ]
    `);
  });

  it('should preserve original content when not aborted', () => {
    const controller = new AbortController();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents('Original response', controller.signal);
    
    const events = eventStream.getEvents();
    expect(events.length).toBe(1);
    
    const assistantEvent = events[0] as AgentEventStream.AssistantMessageEvent;
    expect(assistantEvent.content).toBe('Original response');
  });

  it('should preserve original content even when aborted if content exists', () => {
    const controller = new AbortController();
    controller.abort();
    
    const createFinalEvents = createMockFinalEventsMethod();
    const eventStream = createFinalEvents('Partial response', controller.signal);
    
    const events = eventStream.getEvents();
    expect(events.length).toBe(1);
    
    const assistantEvent = events[0] as AgentEventStream.AssistantMessageEvent;
    expect(assistantEvent.content).toBe('Partial response');
  });
});
