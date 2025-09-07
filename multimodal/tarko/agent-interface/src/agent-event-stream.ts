/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChatCompletionContentPart,
  ChatCompletionMessageToolCall,
} from '@tarko/model-provider/types';
import { AgentStatus } from './agent-instance';
import { AgentRunObjectOptions, AgentRunOptions } from './agent-run-options';

/**
 * AgentEventStream namespace - Defines all event types and structures for the Agent framework's internal event stream
 *
 * This namespace contains event definitions used internally by the Agent framework for memory construction,
 * state management, and UI updates. Unlike Agio which focuses on server-side monitoring, AgentEventStream
 * handles the granular conversation flow within individual agent sessions.
 *
 * Key design principles:
 * - String-based event types for better JSON serialization compatibility
 * - Hierarchical categorization of events by functional area
 * - Strict typing for all event payloads
 * - Support for both real-time streaming and batch processing scenarios
 * - Extensible through module augmentation for custom events
 */
export namespace AgentEventStream {
  /**
   * Core event type categories for the Agent framework's internal event stream
   *
   * These events track the detailed conversation flow and state changes
   * within individual agent sessions, providing granular visibility into
   * the agent's reasoning and execution process.
   */
  export type CoreEventType =
    /**
     * Conversation flow events - track the primary dialogue between user and assistant
     */
    | 'user_message'
    | 'assistant_message'
    | 'assistant_thinking_message'

    /**
     * Real-time streaming events - for live updates during agent execution
     */
    | 'assistant_streaming_message'
    | 'assistant_streaming_thinking_message'
    | 'assistant_streaming_tool_call'

    /**
     * Tool execution events - track individual tool calls and their results
     */
    | 'tool_call'
    | 'tool_result'

    /**
     * System and lifecycle events - track agent state and execution flow
     */
    | 'system'
    | 'agent_run_start'
    | 'agent_run_end'

    /**
     * Environment and context events - for external inputs and planning
     */
    | 'environment_input'
    | 'plan_start'
    | 'plan_update'
    | 'plan_finish'

    /**
     * Final output events - for structured final answers and reports
     */
    | 'final_answer'
    | 'final_answer_streaming';

  /**
   * Base properties that all agent events inherit
   */
  export interface BaseEvent {
    /** Unique identifier for this event */
    id: string;

    /** The type of event */
    type: string;

    /** Timestamp when the event was created */
    timestamp: number;
  }

  /**
   * User message event - represents input from the user
   */
  export interface UserMessageEvent extends BaseEvent {
    type: 'user_message';

    /** User's input content (can be text or multimodal) */
    content: string | ChatCompletionContentPart[];
  }

  /**
   * Assistant message event - represents the agent's response
   */
  export interface AssistantMessageEvent extends BaseEvent {
    type: 'assistant_message';

    /** The assistant's response content */
    content: string;

    /** The assistant's original response content */
    rawContent?: string;

    /** Tool calls made by the assistant (if any) */
    toolCalls?: ChatCompletionMessageToolCall[];

    /** How the response was finished */
    finishReason?: string;

    /**
     * Time to First Token (TTFT) in milliseconds - time from request start to first content chunk.
     * The time it takes for the model to return the first token of the response after it receives the prompt.
     *
     * @see https://modal.com/llm-almanac/how-to-benchmark
     * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompt-best-practices
     */
    ttftMs?: number;

    /**
     * Time to Last Token (TTLT) in milliseconds - time from request start to response completion.
     * The overall time taken by the model to process the prompt and generate the complete response.
     *
     * @see https://modal.com/llm-almanac/how-to-benchmark
     * @see https://cloud.google.com/vertex-ai/generative-ai/docs/learn/prompt-best-practices
     */
    ttltMs?: number;

    /**
     * Unique message identifier that links streaming messages to their final message
     * This allows clients to correlate incremental updates with complete messages
     */
    messageId?: string;
  }

  /**
   * Assistant thinking message event - represents the agent's reasoning process
   */
  export interface AssistantThinkingMessageEvent extends BaseEvent {
    type: 'assistant_thinking_message';

    /** The reasoning content */
    content: string;

    /** Whether the thinking process is complete */
    isComplete?: boolean;

    /** Duration of the thinking process in milliseconds */
    thinkingDurationMs?: number;

    /**
     * Unique message identifier that links thinking messages to their session
     * This allows clients to correlate incremental updates with complete thinking
     */
    messageId?: string;
  }

  /**
   * Assistant streaming message event - for real-time content updates
   */
  export interface AssistantStreamingMessageEvent extends BaseEvent {
    type: 'assistant_streaming_message';

    /** Incremental content chunk */
    content: string;

    /** Whether this is the final chunk */
    isComplete?: boolean;

    /**
     * Unique message identifier that links streaming messages to their final message
     * This allows clients to correlate incremental updates with complete messages
     */
    messageId?: string;
  }

  /**
   * Assistant streaming thinking message event - for real-time reasoning updates
   */
  export interface AssistantStreamingThinkingMessageEvent extends BaseEvent {
    type: 'assistant_streaming_thinking_message';

    /** Incremental reasoning content chunk */
    content: string;

    /** Whether this is the final reasoning chunk */
    isComplete?: boolean;

    /**
     * Unique message identifier that links streaming thinking messages to their final thinking
     * This allows clients to correlate incremental updates with complete thinking
     */
    messageId?: string;
  }

  /**
   * Assistant streaming tool call event - for real-time tool call updates
   *
   * This event provides incremental updates as tool calls are being constructed
   * during streaming responses. The arguments field contains only the delta (incremental part)
   * to optimize performance for large tool calls like write_file operations.
   */
  export interface AssistantStreamingToolCallEvent extends BaseEvent {
    type: 'assistant_streaming_tool_call';

    /** Tool call ID being constructed */
    toolCallId: string;

    /** Tool name (may be empty if still being constructed) */
    toolName: string;

    /**
     * Delta arguments - only the incremental part of arguments in this chunk.
     * Client should accumulate these deltas to build complete arguments.
     *
     * This delta-based design optimizes performance for tools with large payloads
     * such as write_file operations that may generate substantial argument chunks.
     */
    arguments: string;

    /** Whether this tool call is complete */
    isComplete: boolean;

    /**
     * Unique message identifier that links streaming tool calls to their final message
     * This allows clients to correlate incremental updates with complete messages
     */
    messageId?: string;
  }

  /**
   * Tool call event - represents a tool being invoked
   */
  export interface ToolCallEvent extends BaseEvent {
    type: 'tool_call';

    /** Unique identifier for this tool call */
    toolCallId: string;

    /** Name of the tool being called */
    name: string;

    /** Arguments passed to the tool */
    arguments: Record<string, any>;

    /** When the tool call started */
    startTime: number;

    /** Metadata about the tool */
    tool: {
      name: string;
      description: string;
      schema: any;
    };
  }

  /**
   * Tool result event - represents the result of a tool execution
   */
  export interface ToolResultEvent extends BaseEvent {
    type: 'tool_result';

    /** Unique identifier for the corresponding tool call */
    toolCallId: string;

    /** Name of the tool that was executed */
    name: string;

    /** The result content from the tool */
    content: any;

    // FIXME: Set its value in message history.
    /** Processed multimodal content (if applicable) */
    processedContent?: ChatCompletionContentPart[];

    /** Time taken to execute the tool */
    elapsedMs: number;

    /** Error message if the tool execution failed */
    error?: string;

    // FIXME: replaced it by a long-term solution.
    // using to set extra state, for internal usage, please DO NOT depend on it
    _extra?: any;
  }

  /**
   * System event - for logs, warnings, and system messages
   */
  export interface SystemEvent extends BaseEvent {
    type: 'system';

    /** Severity level of the message */
    level: 'info' | 'warning' | 'error';

    /** The system message */
    message: string;

    /** Additional details about the event */
    details?: Record<string, any>;
  }

  /**
   * Agent run start event - marks the beginning of an agent execution session
   */
  export interface AgentRunStartEvent extends BaseEvent {
    type: 'agent_run_start';

    /** Unique session identifier */
    sessionId: string;

    /** Runtime options for this execution */
    runOptions: AgentRunObjectOptions;

    /** Model provider being used */
    provider?: string;

    /** Model identifier being used */
    model?: string;

    /** Display name for the model */
    modelDisplayName?: string;

    /** Agent name being used */
    agentName?: string;
  }

  /**
   * Agent run end event - marks the completion of an agent execution session
   */
  export interface AgentRunEndEvent extends BaseEvent {
    type: 'agent_run_end';

    /** Unique session identifier */
    sessionId: string;

    /** Number of iterations executed */
    iterations: number;

    /** Total execution time */
    elapsedMs: number;

    /** Final execution status */
    status: AgentStatus;
  }

  /**
   * Base metadata interface for environment input events
   */
  export interface BaseEnvironmentInputMetadata {
    /** Type of environment input */
    type: string;
  }

  /**
   * Screenshot-specific metadata
   */
  export interface ScreenshotMetadata extends BaseEnvironmentInputMetadata {
    type: 'screenshot';
    /** URL of the webpage being captured in the screenshot */
    url?: string;
  }

  /**
   * Text content metadata
   */
  export interface TextMetadata extends BaseEnvironmentInputMetadata {
    type: 'text';
  }

  /**
   * Codebase metadata
   */
  export interface CodebaseMetadata extends BaseEnvironmentInputMetadata {
    type: 'codebase';
  }

  /**
   * Generic metadata for other types
   */
  export interface GenericMetadata extends BaseEnvironmentInputMetadata {
    type: string;
  }

  /**
   * Union type for all environment input metadata types
   */
  export type EnvironmentInputMetadata =
    | ScreenshotMetadata
    | TextMetadata
    | CodebaseMetadata
    | GenericMetadata;

  /**
   * Environment input event - for injecting contextual information
   *
   * This allows agents to receive multimodal context from their environment
   * without attributing it to a user message
   */
  export interface EnvironmentInputEvent extends BaseEvent {
    type: 'environment_input';

    /** The environment content (can be multimodal) */
    content: string | ChatCompletionContentPart[];

    /**
     * Optional description of the environment input.
     * Description is used in Message History for constructing context,
     * while metadata is not included in the context.
     */
    description?: string;

    /**
     * Optional metadata for the environment input.
     * Metadata provides structured information about the input type and properties
     * but is NOT included in Message History context construction.
     */
    metadata?: EnvironmentInputMetadata;
  }

  /**
   * Type guard function to check if metadata is screenshot metadata
   */
  export function isScreenshotMetadata(
    metadata: EnvironmentInputMetadata,
  ): metadata is ScreenshotMetadata {
    return metadata.type === 'screenshot';
  }

  /**
   * Type guard function to check if an event is an environment input event
   */
  export function isEnvironmentInputEvent(event: Event): event is EnvironmentInputEvent {
    return event.type === 'environment_input';
  }

  /**
   * Type guard function to check if an environment input event has screenshot metadata
   */
  export function hasScreenshotMetadata(
    event: EnvironmentInputEvent,
  ): event is EnvironmentInputEvent & { metadata: ScreenshotMetadata } {
    return event.metadata !== undefined && isScreenshotMetadata(event.metadata);
  }

  /**
   * Represents a single step in a plan
   */
  export interface PlanStep {
    /** Description of what needs to be done */
    content: string;

    /** Whether this step has been completed */
    done: boolean;
  }

  /**
   * Plan start event - signals the beginning of a planning session
   */
  export interface PlanStartEvent extends BaseEvent {
    type: 'plan_start';

    /** Session identifier for this planning session */
    sessionId: string;
  }

  /**
   * Plan update event - contains the current state of the plan
   */
  export interface PlanUpdateEvent extends BaseEvent {
    type: 'plan_update';

    /** Session identifier for this planning session */
    sessionId: string;

    /** Current plan steps with their completion status */
    steps: AgentEventStream.PlanStep[];
  }

  /**
   * Plan finish event - signals the completion of the plan
   */
  export interface PlanFinishEvent extends BaseEvent {
    type: 'plan_finish';

    /** Session identifier for this planning session */
    sessionId: string;

    /** Summary of the completed plan */
    summary: string;
  }

  /**
   * Final answer event - contains a structured final response
   */
  export interface FinalAnswerEvent extends BaseEvent {
    type: 'final_answer';

    /** The final answer content */
    content: string;

    /** Whether this is from a deep research process */
    isDeepResearch: boolean;

    /** Optional title for the answer */
    title?: string;

    /** Format of the answer (e.g., 'markdown', 'json') */
    format?: string;

    /**
     * Unique message identifier that links streaming messages to their final message
     * This allows clients to correlate incremental updates with complete messages
     */
    messageId?: string;
  }

  /**
   * Final answer streaming event - for real-time final answer updates
   */
  export interface FinalAnswerStreamingEvent extends BaseEvent {
    type: 'final_answer_streaming';

    /** Incremental content chunk */
    content: string;

    /** Whether this is from a deep research process */
    isDeepResearch: boolean;

    /** Whether this is the final chunk */
    isComplete?: boolean;

    /**
     * Unique message identifier that links streaming messages to their final message
     * This allows clients to correlate incremental updates with complete messages
     */
    messageId?: string;
  }

  /**
   * Core event mappings for built-in event types
   */
  export interface CoreEventMapping {
    user_message: UserMessageEvent;
    assistant_message: AssistantMessageEvent;
    assistant_thinking_message: AssistantThinkingMessageEvent;
    assistant_streaming_message: AssistantStreamingMessageEvent;
    assistant_streaming_thinking_message: AssistantStreamingThinkingMessageEvent;
    assistant_streaming_tool_call: AssistantStreamingToolCallEvent;
    tool_call: ToolCallEvent;
    tool_result: ToolResultEvent;
    system: SystemEvent;
    agent_run_start: AgentRunStartEvent;
    agent_run_end: AgentRunEndEvent;
    environment_input: EnvironmentInputEvent;
    plan_start: PlanStartEvent;
    plan_update: PlanUpdateEvent;
    plan_finish: PlanFinishEvent;
    final_answer: FinalAnswerEvent;
    final_answer_streaming: FinalAnswerStreamingEvent;
  }

  /**
   * Extended event mapping interface for module augmentation
   * Third-party modules can extend this interface to add custom event mappings
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface ExtendedEventMapping {
    // This interface is intentionally empty and serves as an extension point
  }

  /**
   * Combined event mapping that includes both core and extended events
   */
  export type EventMapping = CoreEventMapping & ExtendedEventMapping;

  /**
   * Combined event type that includes both core and extended event types
   * Derived from the keys of EventMapping for single source of truth
   */
  export type EventType = keyof EventMapping;

  /**
   * Union of all event types in the Agent event stream
   * Now supports both core and extended events through module augmentation
   */
  export type Event = EventMapping[EventType];

  /**
   * Event payload type - provides type safety for event creation
   * Now supports extended event types through module augmentation
   */
  export type EventPayload<T extends EventType> = T extends keyof EventMapping
    ? EventMapping[T]
    : never;

  /**
   * Event stream options for configuring the event stream processor
   */
  export interface ProcessorOptions {
    /** Maximum number of events to keep in memory */
    maxEvents?: number;

    /** Whether to automatically trim old events */
    autoTrim?: boolean;
  }

  /**
   * Event stream interface for process agent events
   */
  export interface Processor {
    /**
     * Create a new event with the specified type and data
     */
    createEvent<T extends AgentEventStream.EventType>(
      type: T,
      data: Omit<AgentEventStream.EventPayload<T>, keyof AgentEventStream.BaseEvent>,
    ): AgentEventStream.EventPayload<T>;

    /**
     * Send an event to the stream
     */
    sendEvent(event: AgentEventStream.Event): void;

    /**
     * Get events from the stream with optional filtering
     */
    getEvents(filter?: AgentEventStream.EventType[], limit?: number): AgentEventStream.Event[];

    /**
     * Get events by specific types
     */
    getEventsByType(types: AgentEventStream.EventType[], limit?: number): AgentEventStream.Event[];

    /**
     * Subscribe to new events
     */
    subscribe(callback: (event: AgentEventStream.Event) => void): () => void;

    /**
     * Subscribe to specific event types
     */
    subscribeToTypes(
      types: AgentEventStream.EventType[],
      callback: (event: AgentEventStream.Event) => void,
    ): () => void;

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
    ): () => void;

    /**
     * Get tool call results since the last assistant message
     */
    getLatestToolResults(): { toolCallId: string; toolName: string; content: any }[];

    /**
     * Clear all events from the stream
     */
    dispose(): void;
  }
}
