/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Event, EventType, EventStream } from '@agent-tars/core';

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
   * @param agentEventStream Agent's event stream manager
   * @returns Unsubscribe function
   */
  connectToAgentEventStream(agentEventStream: EventStream): () => void {
    const handleEvent = (event: Event) => {
      // Mapping event types to socket.io-friendly events
      switch (event.type) {
        case EventType.AGENT_RUN_START:
          // 确保明确发送processing状态
          this.emit('agent-status', { isProcessing: true, state: 'executing' });
          break;

        case EventType.AGENT_RUN_END:
          // 确保明确发送完成状态
          this.emit('agent-status', { isProcessing: false, state: event.status || 'idle' });
          break;

        case EventType.USER_MESSAGE:
          // 用户消息时明确设置处理中状态
          this.emit('agent-status', { isProcessing: true, state: 'processing' });
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

      // 特别处理中止事件
      if (event.type === EventType.SYSTEM && event.message?.includes('aborted')) {
        this.emit('aborted', { message: event.message });
        // 中止后明确设置非处理状态
        this.emit('agent-status', { isProcessing: false, state: 'idle' });
      }

      // Add handling for status events
      if (event.type === EventType.SYSTEM && event.message?.includes('status')) {
        this.emit('status', { message: event.message });
      }
    };

    // Subscribe to the Agent's event stream
    return agentEventStream.subscribe(handleEvent);
  }
}
