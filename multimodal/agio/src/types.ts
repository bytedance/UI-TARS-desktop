/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agio (Agent Insights and Observations) is a data collection mechanism
 * for insights into Agent behavior, performance and usage patterns.
 */

/**
 * Supported event types for agent analytics
 */
export enum AgioEventType {
  // Agent lifecycle events
  AGENT_INITIALIZED = 'agent_initialized',
  AGENT_RUN_START = 'agent_run_start',
  AGENT_RUN_END = 'agent_run_end',
  AGENT_CLEANUP = 'agent_cleanup',

  // Performance metrics
  AGENT_TTFT = 'agent_ttft', // Time to first token
  AGENT_TPS = 'agent_tps', // Tokens per second

  // Loop and tool events
  AGENT_LOOP_START = 'agent_loop_start',
  AGENT_LOOP_END = 'agent_loop_end',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',

  // User feedback
  USER_FEEDBACK = 'user_feedback',

  // Feature usage
  FEATURE_USAGE = 'feature_usage',

  // Custom extension point for specialized events
  CUSTOM = 'custom',
}

/**
 * Base event interface that all events extend
 */
export interface AgioBaseEvent {
  /** Event type */
  type: AgioEventType;

  /** Timestamp when the event was created */
  timestamp: number;

  /** Unique identifier for the agent session */
  sessionId: string;

  /** Unique identifier for the task/run within a session */
  runId?: string;
}

/**
 * Agent initialization event - sent when agent is first created
 */
export interface AgioAgentInitializedEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_INITIALIZED;

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

    /** Whether preset instructions are used */
    usingPreset?: boolean;

    /** Custom MCP servers if configured */
    mcpServers?: string[];
  };

  /** System information */
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
 */
export interface AgioAgentRunStartEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_RUN_START;

  /** User query that initiated the run */
  query: string;

  /** Whether streaming mode is enabled */
  streaming: boolean;
}

/**
 * Agent run end event - sent when a task completes
 */
export interface AgioAgentRunEndEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_RUN_END;

  /** Total execution time in milliseconds */
  executionTimeMs: number;

  /** Number of agent loops executed */
  loopCount: number;

  /** Total token usage */
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
 */
export interface AgioTTFTEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_TTFT;

  /** Time in milliseconds until first token was received */
  ttftMs: number;
}

/**
 * Agent TPS (Tokens Per Second) event
 */
export interface AgioTPSEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_TPS;

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
 */
export interface AgioLoopStartEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_LOOP_START;

  /** Loop iteration number */
  iteration: number;
}

/**
 * Agent loop end event - sent at the end of each agent iteration
 */
export interface AgioLoopEndEvent extends AgioBaseEvent {
  type: AgioEventType.AGENT_LOOP_END;

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
 */
export interface AgioToolCallEvent extends AgioBaseEvent {
  type: AgioEventType.TOOL_CALL;

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
 */
export interface AgioToolResultEvent extends AgioBaseEvent {
  type: AgioEventType.TOOL_RESULT;

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
 */
export interface AgioUserFeedbackEvent extends AgioBaseEvent {
  type: AgioEventType.USER_FEEDBACK;

  /** User rating (e.g., 1-5 stars, thumbs up/down) */
  rating?: number;

  /** Whether the user considered the task solved */
  taskSolved: boolean;

  /** Optional comments from user */
  comments?: string;
}

/**
 * Feature usage event - tracks which features are being used
 */
export interface AgioFeatureUsageEvent extends AgioBaseEvent {
  type: AgioEventType.FEATURE_USAGE;

  /** Feature category */
  category: 'tool' | 'ui' | 'core' | 'extension';

  /** Feature name */
  featureName: string;

  /** Action performed with the feature */
  action: 'enabled' | 'disabled' | 'used' | 'configured';

  /** Additional properties specific to the feature */
  properties?: Record<string, any>;
}

/**
 * Custom event for extensibility
 */
export interface AgioCustomEvent extends AgioBaseEvent {
  type: AgioEventType.CUSTOM;

  /** Custom event name */
  eventName: string;

  /** Custom event data */
  data: Record<string, any>;
}

/**
 * Union type for all Agio events
 */
export type AgioEvent =
  | AgioAgentInitializedEvent
  | AgioAgentRunStartEvent
  | AgioAgentRunEndEvent
  | AgioTTFTEvent
  | AgioTPSEvent
  | AgioLoopStartEvent
  | AgioLoopEndEvent
  | AgioToolCallEvent
  | AgioToolResultEvent
  | AgioUserFeedbackEvent
  | AgioFeatureUsageEvent
  | AgioCustomEvent;

/**
 * Event payload type - provides type safety for event creation
 */
export type AgioEventPayload<T extends AgioEventType> = Extract<AgioEvent, { type: T }>;
