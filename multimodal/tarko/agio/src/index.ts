/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agio (Agent Insights and Observations) is a standard multimodal AI Agent Server monitoring protocol
 * for gathering insights into Agent behavior, performance and usage patterns.
 *
 * Key design principles:
 *
 * - Standardization: Provides a consistent event schema for all agent activities
 * - Extensibility: Allows developers to implement the Agio standard in their own systems
 * - Privacy-focused: Supports private deployments with full control over data collection
 * - Observability: Enables comprehensive monitoring and analytics of agent performance
 *
 * Key distinctions from Agent Event Stream:
 * - Purpose: While Agent Event Stream is an internal mechanism for memory and UI construction,
 *   Agio focuses on server-side monitoring, analytics, and operational insights
 * - Audience: Agent Event Stream is for Agent Framework developers, while Agio
 *   targets operations and product teams needing deployment metrics
 * - Scope: Agio collects higher-level events like performance metrics, usage patterns,
 *   and operational health that are relevant across multiple sessions
 *
 * The goal of this protocol is to provide standardized server-side monitoring
 * for Agent operations, allowing service providers to focus on implementing
 * monitoring infrastructure rather than designing data schemas.
 */

import {
  AgentEventStream,
  ChatCompletionContentPart,
  ToolCallEngineType,
} from '@tarko/agent-interface';

export namespace AgioEvent {
  /**
   * Supported event types for Agio server monitoring protocol
   *
   * Unlike Agent Event Stream events which track individual interactions,
   * these events focus on operational metrics and service health
   */
  export type EventType =
    /**
     * Agent lifecycle events - track service-level operations
     */
    | 'agent_initialized'
    | 'agent_run_start'
    | 'agent_run_end'

    /**
     * Performance metrics - for monitoring service quality
     */
    | 'agent_ttft' // Time to first token
    | 'agent_tps' // Tokens per second

    /**
     * Loop and tool events - for tracking execution patterns
     */
    | 'agent_loop_start'
    | 'agent_loop_end'
    | 'tool_call'
    | 'tool_result'

    /**
     * User feedback - for quality evaluation
     */
    | 'user_feedback';

  /**
   * Base event interface that all monitoring events extend
   */
  export interface BaseEvent {
    /** Event type */
    type: EventType | string;

    /** Timestamp when the event was created */
    timestamp: number;

    /** Unique identifier for the agent session */
    sessionId: string;

    /** Unique identifier for the task/run within a session */
    runId?: string;
  }

  /**
   * Agent initialization event - sent when agent is first created
   * Used for tracking service deployment and configuration
   */
  export interface AgentInitializedEvent extends BaseEvent {
    type: 'agent_initialized';

    /** Agent configuration details */
    config: {
      // LLM Start
      /** The provider of the model */
      modelProvider?: string;

      /** The name of the model */
      modelName?: string;

      /** Max tokens */
      maxTokens?: number;

      /** Remperature */
      temperature?: number;

      // Agent Start
      /** Tool call engine type */
      toolCallEngine?: ToolCallEngineType;

      /** Max iterations for agent */
      maxIterations?: number;

      /** Browser control mode */
      browserControl?: string;

      /** Whether planner is enabled */
      plannerEnabled?: boolean;

      /** Whether thinking mode is enabled */
      thinkingEnabled?: boolean;

      /** Whether snapshot feature is enabled */
      snapshotEnabled?: boolean;

      /** Whether deep research is enabled */
      researchEnabled?: boolean;

      /** Whether to add some custom MCP servers */
      customMcpServers?: boolean;
    };

    count?: {
      /** Model provider count */
      modelProvidersCount: number;

      /** Tool count */
      toolsCount: number;

      /** MCP Servers count */
      mcpServersCount: number;
    };
  }

  /**
   * Agent run start event - sent when a new task begins
   * Used for tracking service load and usage patterns
   */
  export interface AgentRunStartEvent extends BaseEvent {
    type: 'agent_run_start';

    /** User input that initiated the run (can be text or multimodal content) */
    input: string | ChatCompletionContentPart[];

    /** Is it multimodal input */
    isMultimodalInput: boolean;

    /** Whether streaming mode is enabled */
    streaming: boolean;
  }

  /**
   * Agent run end event - sent when a task completes
   * Used for tracking completion rates, errors, and resource usage
   */
  export interface AgentRunEndEvent extends BaseEvent {
    type: 'agent_run_end';

    /** Total execution time in milliseconds */
    executionTimeMs: number;

    /** Number of agent loops executed */
    loopCount: number;

    /** Total token usage for resource monitoring */
    tokenUsage?: {
      /** Input tokens consumed */
      input: number;
      /** Output tokens generated */
      output: number;
      /** Total tokens used */
      total: number;
    };

    /** Whether the run completed successfully */
    successful: boolean;

    /** Error information if run failed */
    error?: string;
  }

  /**
   * Agent TTFT (Time To First Token) event
   * Critical performance metric for user experience monitoring
   */
  export interface TTFTEvent extends BaseEvent {
    type: 'agent_ttft';

    /** Current model name */
    modelName?: string;

    /** Time in milliseconds until first token was received */
    ttftMs: number;
  }

  /**
   * Agent TPS (Tokens Per Second) event
   * Performance metric for throughput monitoring
   */
  export interface TPSEvent extends BaseEvent {
    type: 'agent_tps';

    /** Tokens per second rate */
    tps: number;

    /** Total tokens in this measurement */
    tokenCount: number;

    /** Model name for this measurement */
    modelName?: string;
  }

  /**
   * Agent loop start event - sent at the beginning of each agent iteration
   * Used for tracking execution patterns and complexity
   */
  export interface LoopStartEvent extends BaseEvent {
    type: 'agent_loop_start';

    /** Loop iteration number */
    iteration: number;
  }

  /**
   * Agent loop end event - sent at the end of each agent iteration
   * Used for tracking execution efficiency and resource usage
   */
  export interface LoopEndEvent extends BaseEvent {
    type: 'agent_loop_end';

    /** Loop iteration number */
    iteration: number;

    /** Execution time for this loop in milliseconds */
    durationMs: number;

    /** Token usage for this loop */
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
  }

  /**
   * Tool call event - sent when agent calls a tool
   * Used for tracking tool usage patterns and dependencies
   */
  export interface ToolCallEvent extends BaseEvent {
    type: 'tool_call';

    /** Name of the tool being called */
    toolName: string;

    /** Tool call ID */
    toolCallId: string;

    /** Arguments passed to the tool (sanitized to remove sensitive data) */
    arguments?: Record<string, any>;

    /** Arguments size, used for agent to optimize memory */
    argumentsSize?: number;

    /** MCP server name if applicable */
    mcpServer?: string;
  }

  /**
   * Tool result event - sent when a tool returns a result
   * Used for tracking tool reliability and performance
   */
  export interface ToolResultEvent extends BaseEvent {
    type: 'tool_result';

    /** Name of the tool called */
    toolName: string;

    /** Tool call ID */
    toolCallId: string;

    /** Execution time in milliseconds */
    executionTimeMs: number;

    /** Whether the tool execution was successful */
    successful: boolean;

    /** Size of the result in bytes */
    resultSize?: number;

    /** Content type of the result */
    contentType?: string;
  }

  /**
   * User feedback event - sent when user provides feedback on task
   * Used for tracking user satisfaction and service quality
   */
  export interface UserFeedbackEvent extends BaseEvent {
    type: 'user_feedback';

    /** User rating (e.g., 1-5 stars, thumbs up/down) */
    rating?: number;

    /** Whether the user considered the task solved */
    taskSolved: boolean;

    /** Optional comments from user */
    comments?: string;
  }

  /**
   * Union type for all Agio monitoring events
   */
  export type Event =
    | AgentInitializedEvent
    | AgentRunStartEvent
    | AgentRunEndEvent
    | TTFTEvent
    | TPSEvent
    | LoopStartEvent
    | LoopEndEvent
    | ToolCallEvent
    | ToolResultEvent
    | UserFeedbackEvent;

  /**
   * Event payload type - provides type safety for event creation
   */
  export type EventPayload<T extends EventType> = Extract<Event, { type: T }>;

  /**
   * AgioProvider - Standard interface for manage Agio events
   */
  export interface AgioProvider {
    /**
     * Send agent initialization event
     * Called when an agent session is created
     */
    sendAgentInitialized(): Promise<void>;

    /**
     * Process agent stream events and convert to AGIO events
     */
    processAgentEvent(event: AgentEventStream.Event): Promise<void>;

    /**
     * cleanup
     */
    cleanup(): Promise<void>;
  }

  /**
   * Extension interface for custom Agio event types
   *
   * This allows third-party libraries to extend the Agio protocol with their own event types
   * while maintaining type safety and consistency with the core schema.
   *
   * @example
   * ```typescript
   * // Define custom events
   * interface CustomAgioEvents {
   *   'custom_metric': {
   *     type: 'custom_metric';
   *     metricName: string;
   *     value: number;
   *     unit: string;
   *   };
   * }
   *
   * // Extend the namespace
   * declare module '@tarko/agio' {
   *   namespace AgioEvent {
   *     interface Extensions extends CustomAgioEvents {}
   *   }
   * }
   *
   * // Now you can use the extended types
   * const customEvent: AgioEvent.ExtendedEvent = {
   *   type: 'custom_metric',
   *   timestamp: Date.now(),
   *   sessionId: 'session-123',
   *   metricName: 'response_quality',
   *   value: 0.95,
   *   unit: 'score'
   * };
   * ```
   */
  export interface Extensions {}

  /**
   * Extended event type that includes both core and custom events
   */
  export type ExtendedEvent = Event | Extensions[keyof Extensions];

  /**
   * Extended event type union for type guards and filtering
   */
  export type ExtendedEventType = EventType | keyof Extensions;

  /**
   * Type-safe payload extraction for extended events
   */
  export type ExtendedEventPayload<T extends ExtendedEventType> = T extends EventType
    ? EventPayload<T>
    : T extends keyof Extensions
      ? Extensions[T]
      : never;

  /**
   * Create a type-safe Agio event with automatic timestamp and proper typing
   * Supports both core events and extended custom events
   *
   * @template T The event type (core or extended)
   * @param type The event type identifier
   * @param sessionId The session identifier
   * @param payload The event-specific payload (excluding type, timestamp, sessionId)
   * @returns A complete, type-safe Agio event
   *
   * @example
   * ```typescript
   * // Core event
   * const ttftEvent = createEvent('agent_ttft', 'session-123', {
   *   runId: 'run-456',
   *   ttftMs: 150
   * });
   *
   * // Extended event (if Extensions are declared)
   * const customEvent = createEvent('custom_metric', 'session-123', {
   *   metricName: 'quality',
   *   value: 0.95,
   *   unit: 'score'
   * });
   * ```
   */
  export function createEvent<T extends ExtendedEventType>(
    type: T,
    sessionId: string,
    payload: Omit<ExtendedEventPayload<T>, 'type' | 'timestamp' | 'sessionId'>,
  ): ExtendedEventPayload<T> {
    return {
      type,
      timestamp: Date.now(),
      sessionId,
      ...payload,
    } as ExtendedEventPayload<T>;
  }

  /**
   * Create multiple events at once with the same session ID
   * Useful for batch event creation
   *
   * @param sessionId The session identifier for all events
   * @param events Array of event definitions with type and payload
   * @returns Array of complete, type-safe Agio events
   *
   * @example
   * ```typescript
   * const events = createEvents('session-123', [
   *   { type: 'agent_run_start', payload: { content: 'Hello', streaming: false } },
   *   { type: 'agent_ttft', payload: { ttftMs: 150 } }
   * ]);
   * ```
   */
  export function createEvents<T extends ExtendedEventType>(
    sessionId: string,
    events: Array<{
      type: T;
      payload: Omit<ExtendedEventPayload<T>, 'type' | 'timestamp' | 'sessionId'>;
    }>,
  ): Array<ExtendedEventPayload<T>> {
    return events.map(({ type, payload }) => createEvent(type, sessionId, payload));
  }

  /**
   * Utility function to check if an event is of a specific type
   * Provides type narrowing for event processing
   *
   * @template T The event type to check for
   * @param event The event to check
   * @param type The expected event type
   * @returns Type predicate indicating if event matches the type
   *
   * @example
   * ```typescript
   * if (isEventType(event, 'agent_ttft')) {
   *   // event is now typed as TTFTEvent
   *   console.log(event.ttftMs);
   * }
   * ```
   */
  export function isEventType<T extends ExtendedEventType>(
    event: ExtendedEvent,
    type: T,
  ): event is ExtendedEventPayload<T> {
    return event.type === type;
  }
}
