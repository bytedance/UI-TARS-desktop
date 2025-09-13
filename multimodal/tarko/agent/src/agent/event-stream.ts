/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentEventStream } from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';

/**
 * Default event stream options
 */
const DEFAULT_OPTIONS: AgentEventStream.ProcessorOptions = {
  maxEvents: 1000,
  autoTrim: true,
};

/**
 * Implementation of the EventStream processor
 */
export class AgentEventStreamProcessor implements AgentEventStream.Processor {
  private events: AgentEventStream.Event[] = [];
  private options: AgentEventStream.ProcessorOptions;
  private subscribers: ((event: AgentEventStream.Event) => void)[] = [];
  private logger = getLogger('EventStream');

  constructor(options: AgentEventStream.ProcessorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger.debug('EventStream initialized with options:', this.options);
  }

  /**
   * Create a new event with default properties
   */
  createEvent<T extends AgentEventStream.EventType>(
    type: T,
    data: Omit<AgentEventStream.EventPayload<T>, keyof AgentEventStream.BaseEvent>,
  ): AgentEventStream.EventPayload<T> {
    return {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      ...data,
    } as AgentEventStream.EventPayload<T>;
  }

  /**
   * Send an event to the stream
   */
  sendEvent(event: AgentEventStream.Event): void {
    this.events.push(event);
    this.logger.debug(
      `Event added: ${event.type} (${event.id}), total events: ${this.events.length}`,
    );

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in event subscriber:', error);
      }
    });

    // True sliding window - only remove the oldest event when over limit
    if (
      this.options.autoTrim &&
      this.options.maxEvents &&
      this.events.length > this.options.maxEvents
    ) {
      // Remove only the oldest event to maintain sliding window behavior
      const removedEvent = this.events.shift();
      this.logger.debug(
        `Sliding window: removed oldest event ${removedEvent?.type} (${this.events.length} remaining)`,
      );
    }
  }

  /**
   * Get all events in the stream
   */
  getEvents(filter?: AgentEventStream.EventType[], limit?: number): AgentEventStream.Event[] {
    this.logger.debug(
      `getEvents called: total events=${this.events.length}, filter=${filter}, limit=${limit}`,
    );
    let events = this.events;

    // Apply type filter if provided
    if (filter && filter.length > 0) {
      events = events.filter((event) => filter.includes(event.type));
      this.logger.debug(`After filter: ${events.length} events`);
    }

    // Apply limit if provided
    if (limit && limit > 0 && events.length > limit) {
      events = events.slice(events.length - limit);
      this.logger.debug(`After limit: ${events.length} events`);
    }

    this.logger.debug(`getEvents returning ${events.length} events`);
    return [...events]; // Return a copy to prevent mutation
  }

  /**
   * Get events by their type
   */
  getEventsByType(types: AgentEventStream.EventType[], limit?: number): AgentEventStream.Event[] {
    return this.getEvents(types, limit);
  }

  /**
   * Get tool results since the last assistant message
   */
  getLatestToolResults(): { toolCallId: string; toolName: string; content: any }[] {
    // Find the index of the most recent assistant message
    const assistantEvents = this.getEventsByType(['assistant_message']);
    if (assistantEvents.length === 0) {
      return [];
    }

    const latestAssistantEvent = assistantEvents[assistantEvents.length - 1];
    const latestAssistantIndex = this.events.findIndex(
      (event) => event.id === latestAssistantEvent.id,
    );

    // Get all tool result events that occurred after the latest assistant message
    const toolResultEvents = this.events.filter(
      (event, index) => index > latestAssistantIndex && event.type === 'tool_result',
    ) as AgentEventStream.ToolResultEvent[];

    return toolResultEvents.map((event) => ({
      toolCallId: event.toolCallId,
      toolName: event.name,
      content: event.content,
    }));
  }

  /**
   * Subscribe to new events
   */
  subscribe(callback: (event: AgentEventStream.Event) => void): () => void {
    this.subscribers.push(callback);
    this.logger.debug(`Subscribed to events (total subscribers: ${this.subscribers.length})`);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);

      this.logger.debug(
        `Unsubscribed from events (remaining subscribers: ${this.subscribers.length})`,
      );
    };
  }

  /**
   * Subscribe to specific event types
   */
  subscribeToTypes(
    types: AgentEventStream.EventType[],
    callback: (event: AgentEventStream.Event) => void,
  ): () => void {
    const wrappedCallback = (event: AgentEventStream.Event) => {
      if (types.includes(event.type)) {
        callback(event);
      }
    };

    this.subscribers.push(wrappedCallback);
    this.logger.debug(`Subscribed to event types: ${types.join(', ')}`);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== wrappedCallback);
      this.logger.debug(`Unsubscribed from event types: ${types.join(', ')}`);
    };
  }

  /**
   * Subscribe to streaming events only
   */
  subscribeToStreamingEvents(
    callback: (
      event:
        | AgentEventStream.AssistantStreamingMessageEvent
        | AgentEventStream.AssistantStreamingThinkingMessageEvent
        | AgentEventStream.AssistantStreamingToolCallEvent,
    ) => void,
  ): () => void {
    const streamingTypes: AgentEventStream.EventType[] = [
      'assistant_streaming_message',
      'assistant_streaming_thinking_message',
      'assistant_streaming_tool_call',
    ];

    const wrappedCallback = (event: AgentEventStream.Event) => {
      if (streamingTypes.includes(event.type)) {
        callback(
          event as
            | AgentEventStream.AssistantStreamingMessageEvent
            | AgentEventStream.AssistantStreamingThinkingMessageEvent
            | AgentEventStream.AssistantStreamingToolCallEvent,
        );
      }
    };

    this.subscribers.push(wrappedCallback);
    this.logger.debug('Subscribed to streaming events');

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== wrappedCallback);
      this.logger.debug('Unsubscribed from streaming events');
    };
  }

  /**
   * Clear all events from the stream
   */
  dispose(): void {
    const eventCount = this.events.length;
    this.events = [];
    this.subscribers = [];
    this.logger.warn(`Event stream cleared - removed ${eventCount} events`);
    console.trace('Event stream dispose called');
  }
}
