import { Getter, Setter } from 'jotai';
import { AgentEventStream } from '@/common/types';

/**
 * Event handler context containing jotai getter and setter
 */
export interface EventHandlerContext {
  get: Getter;
  set: Setter;
}

/**
 * Event processing parameters
 */
export interface EventProcessingParams {
  sessionId: string;
  event: AgentEventStream.Event;
}

/**
 * Base interface for event handlers
 */
export interface EventHandler<T extends AgentEventStream.Event = AgentEventStream.Event> {
  canHandle(event: AgentEventStream.Event): event is T;
  handle(context: EventHandlerContext, sessionId: string, event: T): void | Promise<void>;
}

/**
 * Tool call arguments cache interface
 */
export interface ToolCallArgumentsCache {
  get(toolCallId: string): unknown;
  set(toolCallId: string, args: unknown): void;
  delete(toolCallId: string): void;
  clear(): void;
}

/**
 * Streaming tool call arguments cache interface
 */
export interface StreamingToolCallCache {
  get(toolCallId: string): string;
  set(toolCallId: string, args: string): void;
  delete(toolCallId: string): void;
  clear(): void;
}
