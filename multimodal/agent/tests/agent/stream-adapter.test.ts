/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentEventStream, AgentStatus } from '../../src';
import { AgentEventStreamProcessor } from '../../src/agent/event-stream';
import { StreamAdapter } from '../../src/agent/runner/stream-adapter';

describe('StreamAdapter', () => {
  let eventStream: AgentEventStreamProcessor;
  let streamAdapter: StreamAdapter;

  beforeEach(() => {
    eventStream = new AgentEventStreamProcessor();
    streamAdapter = new StreamAdapter(eventStream);
  });

  describe('createStreamFromEvents', () => {
    it('should create an AsyncIterable from events', async () => {
      const stream = streamAdapter.createStreamFromEvents();
      expect(stream[Symbol.asyncIterator]).toBeDefined();
    });

    it('should yield events as they are sent', async () => {
      const stream = streamAdapter.createStreamFromEvents();

      // Start consuming the stream without awaiting it
      const iteratorPromise = (async () => {
        const events = [];
        for await (const event of stream) {
          events.push(event);
          // Break after receiving 3 events
          if (events.length >= 3) break;
        }
        return events;
      })();

      // Send events that should be received by the iterator
      eventStream.sendEvent(eventStream.createEvent('user_message', { content: 'Hello' }));
      eventStream.sendEvent(
        eventStream.createEvent('assistant_message', {
          content: 'Hi there',
          finishReason: 'stop',
        }),
      );
      eventStream.sendEvent(
        eventStream.createEvent('agent_run_end', {
          sessionId: 'test-session',
          iterations: 1,
          elapsedMs: 100,
          status: AgentStatus.ABORTED,
        }),
      );

      // Wait for the iterator to collect events
      const events = await iteratorPromise;

      // Should have 3 events
      expect(events.length).toBe(3);
      expect(events[0].type).toBe('user_message');
      expect(events[1].type).toBe('assistant_message');
      expect(events[2].type).toBe('agent_run_end');
    });

    it('should handle abort signal correctly', async () => {
      const controller = new AbortController();
      const stream = streamAdapter.createStreamFromEvents(controller.signal);

      // Start consuming the stream without awaiting it
      const iteratorPromise = (async () => {
        const events = [];
        try {
          for await (const event of stream) {
            events.push(event);
          }
        } catch (e) {
          // Ignoring errors
        }
        return events;
      })();

      // Send an event
      eventStream.sendEvent(eventStream.createEvent('user_message', { content: 'Hello' }));

      // Abort the stream
      controller.abort();

      // Send another event that should not be received
      eventStream.sendEvent(
        eventStream.createEvent('assistant_message', {
          content: 'This should not be received',
          finishReason: 'stop',
        }),
      );

      // Wait for the iterator to finish
      const events = await iteratorPromise;

      // Should only have the first event
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('user_message');
    });
  });

  describe('createAbortedStream', () => {
    it('should create a stream with an abort event', async () => {
      const stream = streamAdapter.createAbortedStream();

      const events = [];
      for await (const event of stream) {
        events.push(event);
      }

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('system');
      expect((events[0] as AgentEventStream.SystemEvent).level).toBe('warning');
      expect((events[0] as AgentEventStream.SystemEvent).message).toContain('aborted');
    });
  });

  describe('completeStream and abortStream', () => {
    it('should handle stream completion', () => {
      const loggerSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const finalEvent = eventStream.createEvent('assistant_message', {
        content: 'Final message',
        finishReason: 'stop',
      });

      streamAdapter.completeStream(finalEvent);

      // Should not add any events to the stream
      expect(eventStream.getEvents().length).toBe(0);

      loggerSpy.mockRestore();
    });

    it('should handle stream abortion', () => {
      streamAdapter.abortStream();

      // Should add a system event
      const events = eventStream.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('system');
      expect((events[0] as AgentEventStream.SystemEvent).level).toBe('warning');
      expect((events[0] as AgentEventStream.SystemEvent).message).toContain('aborted');
    });
  });
});
