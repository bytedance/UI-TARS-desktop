/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';

/**
 * StreamAdapter - Adapts between standard events and streaming iterations
 *
 * This class handles the conversion between the event stream and
 * AsyncIterable for streaming responses.
 */
export class StreamAdapter {
  private logger = getLogger('StreamAdapter');

  constructor(private eventStream: AgentEventStream.Processor) {}

  /**
   * Create an AsyncIterable from the event stream for streaming back to the client
   *
   * @param abortSignal Optional abort signal to stop streaming
   * @returns An AsyncIterable of events
   */
  createStreamFromEvents(abortSignal?: AbortSignal): AsyncIterable<AgentEventStream.Event> {
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
    const queue: AgentEventStream.Event[] = [];
    let resolveNext: ((value: IteratorResult<AgentEventStream.Event, any>) => void) | null = null;
    let isComplete = false;

    // Subscribe to all events instead of specific types
    const unsubscribe = this.eventStream.subscribe((event) => {
      // If stream is already complete, ignore new events
      if (isComplete) {
        return;
      }

      // Mark stream is closed when agent is aborted
      if (signal.aborted) {
        isComplete = true;
        // The latest message accompanying abort should be emitted,
        // but all new events after the stream is closed are ignored.
        queue.push(event);
        unsubscribe();
        this.logger.info(`[Stream] Signal aborted, marking stream as complete.`);
      }
      // For agent_run_end, mark the stream as complete after adding this final event
      else if (event.type === 'agent_run_end') {
        queue.push(event);
        isComplete = true;
        unsubscribe();
        this.logger.info(`[Stream] "agent_run_end" event received, marking stream as complete.`);
      }
      // Regular event processing
      else {
        // Add event to queue
        queue.push(event);
      }

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
          async next(): Promise<IteratorResult<AgentEventStream.Event, any>> {
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
            return new Promise<IteratorResult<AgentEventStream.Event, any>>((resolve) => {
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
  createAbortedStream(): AsyncIterable<AgentEventStream.Event> {
    const abortEvent = this.eventStream.createEvent('system', {
      level: 'warning',
      message: 'Request was aborted',
    });

    // Create a single-event stream that completes immediately
    return {
      [Symbol.asyncIterator]() {
        let sent = false;
        return {
          async next(): Promise<IteratorResult<AgentEventStream.Event, any>> {
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
  completeStream(finalEvent: AgentEventStream.AssistantMessageEvent): void {
    this.logger.info(`[Stream] Marking stream as complete with final event`);
  }

  /**
   * Mark the stream as aborted
   */
  abortStream(): void {
    this.logger.info(`[Stream] Marking stream as aborted`);

    // Create an abort system event
    const abortEvent = this.eventStream.createEvent('system', {
      level: 'warning',
      message: 'Request was aborted',
    });

    // Add it to the event stream
    this.eventStream.sendEvent(abortEvent);
  }
}
