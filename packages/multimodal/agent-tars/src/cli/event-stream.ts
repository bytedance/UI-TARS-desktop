/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, EventType, EventStreamManager } from '@multimodal/agent';

/**
 * Implement event stream bridging to forward Agent's native events to the client
 */
export class EventStreamBridge {
  private subscribers: Set<(type: string, data: any) => void> = new Set();

  /**
   * Subscribe to events
   * @param handler event processing function
   */
  subscribe(handler: (type: string, data: any) => void): void {
    this.subscribers.add(handler);
  }

  /**
   * Unsubscribe event
   * @param handler event processing function
   */
  unsubscribe(handler: (type: string, data: any) => void): void {
    this.subscribers.delete(handler);
  }

  /**
   * Publish event
   * @param type event type
   * @param data event data
   */
  emit(type: string, data: any): void {
    for (const handler of this.subscribers) {
      handler(type, data);
    }
  }

  /**
   * Event stream manager connected to Agent
   * @param eventStreamManager Agent's event stream manager
   * @returns Unsubscribe function
   */
  connectToAgentEventStream(eventStreamManager: EventStreamManager): () => void {
    const handleEvent = (event: Event) => {
      // Mapping event types to socket.io-friendly events
      switch (event.type) {
        case EventType.USER_MESSAGE:
          this.emit('query', { text: event.content });
          break;
        case EventType.ASSISTANT_MESSAGE:
          this.emit('answer', { text: event.content });
          break;
        case EventType.TOOL_CALL:
          this.emit('event', {
            type: 'tool_call',
            name: event.name,
            toolCallId: event.toolCallId,
            arguments: event.arguments,
          });
          break;
        case EventType.TOOL_RESULT:
          this.emit('event', {
            type: 'tool_result',
            name: event.name,
            toolCallId: event.toolCallId,
            content: event.content,
            error: event.error,
          });
          break;
        case EventType.SYSTEM:
          this.emit(event.level, { message: event.message });
          break;
        default:
          this.emit('event', event);
      }
    };

    // Subscribe to the Agent's event stream
    return eventStreamManager.subscribe(handleEvent);
  }
}
