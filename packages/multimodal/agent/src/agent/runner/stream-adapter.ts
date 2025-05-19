/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, EventStream, EventType, AssistantMessageEvent } from '../../types';
import { getLogger } from '../../utils/logger';

/**
 * StreamAdapter - Adapts between standard events and streaming iterations
 *
 * This class handles the conversion between the event stream and
 * AsyncIterable for streaming responses.
 */
export class StreamAdapter {
  private logger = getLogger('StreamAdapter');

  constructor(private eventStream: EventStream) {}

  /**
   * Create an AsyncIterable from the event stream for streaming back to the client
   *
   * @returns An AsyncIterable of events
   */
  createStreamFromEvents(): AsyncIterable<Event> {
    // Create an event stream controller to expose events as an AsyncIterable
    const controller = new AbortController();
    const { signal } = controller;

    // Create a queue to buffer events
    const queue: Event[] = [];
    let resolveNext: ((value: IteratorResult<Event, any>) => void) | null = null;
    let isComplete = false;

    // Subscribe to all events that should be exposed in streaming mode
    const unsubscribe = this.eventStream.subscribeToTypes(
      [
        EventType.ASSISTANT_STREAMING_MESSAGE,
        EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
        EventType.ASSISTANT_MESSAGE,
        EventType.TOOL_CALL,
        EventType.TOOL_RESULT,
      ],
      (event) => {
        // Skip events if aborted
        if (signal.aborted) return;

        // For final assistant message, mark the stream as complete
        if (event.type === EventType.ASSISTANT_MESSAGE) {
          const assistantEvent = event as AssistantMessageEvent;
          // Only mark as complete if this is a final answer with no tool calls
          if (!assistantEvent.toolCalls || assistantEvent.toolCalls.length === 0) {
            isComplete = true;
            this.logger.info(`[Stream] Final answer received, marking stream as complete`);
          }
        }

        // Add event to queue
        queue.push(event);

        // If someone is waiting for the next item, resolve their promise
        if (resolveNext) {
          const next = resolveNext;
          resolveNext = null;

          if (queue.length > 0) {
            next({ done: false, value: queue.shift()! });
          } else if (isComplete) {
            next({ done: true, value: undefined });
          }
        }
      },
    );

    // Return an AsyncIterable that yields events as they arrive
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<Event, any>> {
            // If items are in queue, return the next one
            if (queue.length > 0) {
              return { done: false, value: queue.shift()! };
            }

            // If stream is complete and queue is empty, we're done
            if (isComplete) {
              return { done: true, value: undefined };
            }

            // Otherwise wait for the next item
            return new Promise<IteratorResult<Event, any>>((resolve) => {
              resolveNext = resolve;
            });
          },

          async return() {
            // Cancel the execution if consumer stops iterating
            controller.abort();
            unsubscribe();
            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  /**
   * Mark the stream as complete with a final event
   *
   * @param finalEvent The event that signals completion
   */
  completeStream(finalEvent: AssistantMessageEvent): void {
    this.logger.info(`[Stream] Marking stream as complete with final event`);
  }
}
