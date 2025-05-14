/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionContentPart, ChatCompletionMessageToolCall } from './third-party';
import { AgentSingleLoopReponse } from './agent';

/**
 * Event types in the event stream system
 */
export enum EventType {
  USER_MESSAGE = 'user_message',
  ASSISTANT_MESSAGE = 'assistant_message',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  SYSTEM = 'system',
}

/**
 * Base properties for all events
 */
export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: number;
}

/**
 * User message event
 */
export interface UserMessageEvent extends BaseEvent {
  type: EventType.USER_MESSAGE;
  content: string | ChatCompletionContentPart[];
}

/**
 * Assistant message event
 */
export interface AssistantMessageEvent extends BaseEvent {
  type: EventType.ASSISTANT_MESSAGE;
  content: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason?: string;
  elapsedMs?: number;
}

/**
 * Tool call event
 */
export interface ToolCallEvent extends BaseEvent {
  type: EventType.TOOL_CALL;
  toolCallId: string;
  name: string;
  arguments: Record<string, any>;
  startTime: number;
  tool: {
    name: string;
    description: string;
    schema: any;
  };
}

/**
 * Tool result event
 */
export interface ToolResultEvent extends BaseEvent {
  type: EventType.TOOL_RESULT;
  toolCallId: string;
  name: string;
  content: any;
  processedContent?: ChatCompletionContentPart[];
  elapsedMs: number;
  error?: string;
}

/**
 * System event (for logs, warnings, errors)
 */
export interface SystemEvent extends BaseEvent {
  type: EventType.SYSTEM;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
}

/**
 * Union of all event types
 */
export type Event =
  | UserMessageEvent
  | AssistantMessageEvent
  | ToolCallEvent
  | ToolResultEvent
  | SystemEvent;

/**
 * Event stream options
 */
export interface EventStreamOptions {
  maxEvents?: number;
  autoTrim?: boolean;
}
/**
 * Event stream manager interface
 */
export interface EventStreamManager {
  /**
   * Create a new event
   */
  createEvent<T extends EventType>(
    type: T,
    data: Omit<Extract<Event, { type: T }>, keyof BaseEvent>,
  ): Extract<Event, { type: T }>;

  /**
   * Add an event to the stream
   */
  addEvent(event: Event): void;

  /**
   * Get events from the stream
   */
  getEvents(filter?: EventType[], limit?: number): Event[];

  /**
   * Get events by type
   */
  getEventsByType(types: EventType[], limit?: number): Event[];

  /**
   * Clear all events
   */
  clear(): void;

  /**
   * Subscribe to new events
   */
  subscribe(callback: (event: Event) => void): () => void;

  /**
   * Get the latest assistant response
   */
  getLatestAssistantResponse(): AgentSingleLoopReponse | null;

  /**
   * Get tool call results since the last assistant message
   */
  getLatestToolResults(): { toolCallId: string; toolName: string; content: any }[];
}
