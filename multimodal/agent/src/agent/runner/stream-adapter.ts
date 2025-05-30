/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, EventStream, EventType, AssistantMessageEvent } from '@multimodal/agent-interface';
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
   * @param abortSignal Optional abort signal to stop streaming
   * @returns An AsyncIterable of events
   */
  createStreamFromEvents(abortSignal?: AbortSignal): AsyncIterable<Event> {
    // Create an event stream controller to expose events as an AsyncIterable
    const controller = new AbortController();
    const { signal } = controller;

    // Link external abort signal if provided
    if (abortSignal) {
      if (abortSignal.aborted) {
        controller.abort();
      } else {
        abortSignal.addEventListener('abort', () => {
          controller.abort();
        });
      }
    }

    // Create a queue to buffer events
    const queue: Event[] = [];
    let resolveNext: ((value: IteratorResult<Event, any>) => void) | null = null;
    let isComplete = false;

    // Subscribe to all events instead of specific types
    const unsubscribe = this.eventStream.subscribe((event) => {
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
    });

    // Return an AsyncIterable that yields events as they arrive
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<Event, any>> {
            // Check if aborted
            if (signal.aborted) {
              return { done: true, value: undefined };
            }

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

              // Also handle abort while waiting
              if (signal.aborted) {
                resolve({ done: true, value: undefined });
              }
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
   * Create a stream that's already aborted
   * Used when a request is aborted before streaming starts
   */
  createAbortedStream(): AsyncIterable<Event> {
    const abortEvent = this.eventStream.createEvent(EventType.SYSTEM, {
      level: 'warning',
      message: 'Request was aborted',
    });

    // Create a single-event stream that completes immediately
    return {
      [Symbol.asyncIterator]() {
        let sent = false;
        return {
          async next(): Promise<IteratorResult<Event, any>> {
            if (!sent) {
              sent = true;
              return { done: false, value: abortEvent };
            }
            return { done: true, value: undefined };
          },
          async return() {
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

  /**
   * Mark the stream as aborted
   */
  abortStream(): void {
    this.logger.info(`[Stream] Marking stream as aborted`);

    // Create an abort system event
    const abortEvent = this.eventStream.createEvent(EventType.SYSTEM, {
      level: 'warning',
      message: 'Request was aborted',
    });

    // Add it to the event stream
    this.eventStream.sendEvent(abortEvent);
  }
}
