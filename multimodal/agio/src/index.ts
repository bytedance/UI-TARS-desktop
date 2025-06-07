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

import { ChatCompletionContentPart } from '@multimodal/agent-interface';

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
    | 'agent_cleanup'

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
    type: EventType;

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
      /** The provider of the model */
      modelProvider?: string;

      /** The name of the model */
      modelName?: string;

      /** Tool call engine type */
      toolCallEngine?: string;

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

    /** System information for environment tracking */
    system?: {
      /** Operating system platform */
      platform: string;

      /** OS version */
      osVersion: string;

      /** Node.js version */
      nodeVersion: string;
    };
  }

  /**
   * Agent run start event - sent when a new task begins
   * Used for tracking service load and usage patterns
   */
  export interface AgentRunStartEvent extends BaseEvent {
    type: 'agent_run_start';

    /** User input that initiated the run (can be text or multimodal content) */
    content: string | ChatCompletionContentPart[];

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
    error?: {
      message: string;
      code?: string;
    };
  }

  /**
   * Agent TTFT (Time To First Token) event
   * Critical performance metric for user experience monitoring
   */
  export interface TTFTEvent extends BaseEvent {
    type: 'agent_ttft';

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

    /** Duration in milliseconds for this measurement */
    durationMs: number;

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

    /** Whether this is a custom tool */
    isCustomTool: boolean;

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
}
