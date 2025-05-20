/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Event,
  EventType,
  BaseEvent,
  EventStream as IEventStream,
  EventStreamOptions,
  AssistantMessageEvent,
  AgentSingleLoopReponse,
  ToolResultEvent,
  AssistantStreamingMessageEvent,
  AssistantStreamingThinkingMessageEvent,
} from '@multimodal/agent-interface';
import { getLogger } from '../utils/logger';

/**
 * Default event stream options
 */
const DEFAULT_OPTIONS: EventStreamOptions = {
  maxEvents: 1000,
  autoTrim: true,
};

/**
 * Implementation of the EventStream
 */
export class EventStream implements IEventStream {
  private events: Event[] = [];
  private options: EventStreamOptions;
  private subscribers: ((event: Event) => void)[] = [];
  private logger = getLogger('EventStream');

  constructor(options: EventStreamOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.logger.debug('EventStream initialized with options:', this.options);
  }

  /**
   * Create a new event with default properties
   * @param type The event type
   * @param data Additional event data
   */
  createEvent<T extends EventType>(
    type: T,
    data: Omit<Extract<Event, { type: T }>, keyof BaseEvent>,
  ): Extract<Event, { type: T }> {
    return {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      ...data,
    } as Extract<Event, { type: T }>;
  }

  /**
   * Seed an event to the stream
   * @param event The event to add or event data to create an event from
   */
  sendEvent(event: Event): void {
    this.events.push(event);
    this.logger.debug(`Event added: ${event.type} (${event.id})`);

    // Notify subscribers
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in event subscriber:', error);
      }
    });

    // Auto-trim if needed
    if (
      this.options.autoTrim &&
      this.options.maxEvents &&
      this.events.length > this.options.maxEvents
    ) {
      const overflow = this.events.length - this.options.maxEvents;
      this.events = this.events.slice(overflow);
      this.logger.debug(`Auto-trimmed ${overflow} events`);
    }
  }

  /**
   * Get all events in the stream
   * @param filter Optional filter for event types
   * @param limit Optional limit on number of events to return
   */
  getEvents(filter?: EventType[], limit?: number): Event[] {
    let events = this.events;

    // Apply type filter if provided
    if (filter && filter.length > 0) {
      events = events.filter((event) => filter.includes(event.type));
    }

    // Apply limit if provided
    if (limit && limit > 0 && events.length > limit) {
      events = events.slice(events.length - limit);
    }

    return [...events]; // Return a copy to prevent mutation
  }

  /**
   * Get events by their type
   * @param types The event types to filter by
   * @param limit Optional limit on number of events to return
   */
  getEventsByType(types: EventType[], limit?: number): Event[] {
    return this.getEvents(types, limit);
  }

  /**
   * Get the latest assistant response to be used for the next message
   */
  getLatestAssistantResponse(): AgentSingleLoopReponse | null {
    // Get the most recent assistant message event
    const assistantEvents = this.getEventsByType([EventType.ASSISTANT_MESSAGE]);
    if (assistantEvents.length === 0) {
      return null;
    }

    const latestAssistantEvent = assistantEvents[
      assistantEvents.length - 1
    ] as AssistantMessageEvent;
    return {
      content: latestAssistantEvent.content || '',
      toolCalls: latestAssistantEvent.toolCalls,
    };
  }

  /**
   * Get tool results since the last assistant message
   * This method is used to collect all tool results that need to be processed
   * for the next message in the conversation
   */
  getLatestToolResults(): { toolCallId: string; toolName: string; content: any }[] {
    // Find the index of the most recent assistant message
    const assistantEvents = this.getEventsByType([EventType.ASSISTANT_MESSAGE]);
    if (assistantEvents.length === 0) {
      return [];
    }

    const latestAssistantEvent = assistantEvents[assistantEvents.length - 1];
    const latestAssistantIndex = this.events.findIndex(
      (event) => event.id === latestAssistantEvent.id,
    );

    // Get all tool result events that occurred after the latest assistant message
    const toolResultEvents = this.events.filter(
      (event, index) => index > latestAssistantIndex && event.type === EventType.TOOL_RESULT,
    ) as ToolResultEvent[];

    return toolResultEvents.map((event) => ({
      toolCallId: event.toolCallId,
      toolName: event.name,
      content: event.content,
    }));
  }

  /**
   * Clear all events from the stream
   */
  clear(): void {
    this.events = [];
    this.logger.debug('Event stream cleared');
  }

  /**
   * Subscribe to new events
   * @param callback Function to call when a new event is added
   * @returns Function to unsubscribe
   */
  subscribe(callback: (event: Event) => void): () => void {
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
   * @param types Array of event types to subscribe to
   * @param callback Function to call when a matching event is added
   * @returns Function to unsubscribe
   */
  subscribeToTypes(types: EventType[], callback: (event: Event) => void): () => void {
    const wrappedCallback = (event: Event) => {
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
   * @param callback Function to call when a streaming event is added
   * @returns Function to unsubscribe
   */
  subscribeToStreamingEvents(
    callback: (
      event: AssistantStreamingMessageEvent | AssistantStreamingThinkingMessageEvent,
    ) => void,
  ): () => void {
    const streamingTypes = [
      EventType.ASSISTANT_STREAMING_MESSAGE,
      EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
    ];

    const wrappedCallback = (event: Event) => {
      if (streamingTypes.includes(event.type)) {
        callback(event as AssistantStreamingMessageEvent | AssistantStreamingThinkingMessageEvent);
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
}
