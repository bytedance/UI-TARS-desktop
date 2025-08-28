/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineType } from './tool-call-engine';
import { Tool } from './tool';
import { ProviderOptions, LLMReasoningOptions } from '@tarko/model-provider/types';
import { AgentEventStream } from './agent-event-stream';
import { LogLevel } from '@agent-infra/logger';

/**
 * Filter options interface for include/exclude patterns
 */
export interface CommonFilterOptions {
  /**
   * Include only items whose names contain any of these strings
   * Applied before exclude filters
   */
  include?: string[];

  /**
   * Exclude items whose names contain any of these strings
   * Applied after include filters
   */
  exclude?: string[];
}

export { LogLevel };

/**
 * Base configuration options for agent identity and behavior
 */
export interface AgentBaseOptions {
  /**
   * Optional unique identifier for this agent instance.
   * Useful for tracking and logging purposes.
   *
   * @defaultValue `"@tarko/agent"`
   */
  id?: string;

  /**
   * Agent's name, useful for tracing.
   *
   * @defaultValue `"Anonymous"`
   */
  name?: string;

  /**
   * Used to define the Agent's system prompt.
   * This completely replaces the default system prompt when provided.
   *
   * @defaultValue `undefined` (uses default prompt: "You are an intelligent assistant...")
   */
  instructions?: string;
}

/**
 * Model configuration options for LLM interaction and generation
 */
export interface AgentModelOptions {
  /**
   * Model settings.
   *
   * @defaultValue {undefined}
   */
  model?: ProviderOptions;

  /**
   * Maximum number of tokens allowed in the context window.
   *
   * @defaultValue `1000`
   */
  maxTokens?: number;

  /**
   * Temperature used for LLM sampling, controlling randomness.
   * Lower values make the output more deterministic (e.g., 0.1).
   * Higher values make the output more random/creative (e.g., 1.0).
   *
   * @defaultValue `0.7`
   */
  temperature?: number;

  /**
   * Top-p (nucleus) sampling parameter for LLM text generation.
   * Controls the cumulative probability threshold for token selection.
   * Lower values (e.g., 0.1) make output more focused and deterministic.
   * Higher values (e.g., 0.9) allow more diverse and creative outputs.
   * Range: 0.0 to 1.0.
   *
   * @defaultValue `undefined` (uses model's default)
   */
  top_p?: number;

  /**
   * Used to control the reasoning content.
   */
  thinking?: LLMReasoningOptions;
}

/**
 * Tool filtering options for controlling which tools are available
 */
export interface AgentToolFilterOptions extends CommonFilterOptions {}

/**
 * Tool configuration options for agent capabilities and execution engine
 */
export interface AgentToolOptions {
  /**
   * Agent tools defintion
   *
   * @defaultValue `undefined`
   */
  tools?: Tool[];

  /**
   * Tool filtering options for controlling which tools are available
   */
  tool?: AgentToolFilterOptions;

  /**
   * Tool Call Engine configuration - supports both predefined engines and custom constructors.
   *
   * String options:
   * - 'native': Uses OpenAI-compatible native function calling
   * - 'prompt_engineering': Uses prompt-based tool calling for non-compatible models
   * - 'structured_outputs': Uses JSON schema-based structured outputs
   *
   * Constructor option:
   * - Pass a constructor function to create custom Tool Call Engine instances
   *
   * @defaultValue `'native'`
   *
   * @example
   * // Using predefined engine
   * toolCallEngine: 'native'
   *
   * @example
   * // Using custom constructor
   * toolCallEngine: MyCustomToolCallEngine
   */
  toolCallEngine?: ToolCallEngineType;
}

/**
 * Loop control options for agent execution flow and iteration limits
 */
export interface AgentLoopOptions {
  /**
   * Maximum number of iterations of the agent.
   * Modern LLM models have improved agentic loop-horizon task capabilities,
   * allowing for more complex multi-step reasoning processes.
   *
   * @defaultValue `1000`
   */
  maxIterations?: number;
}

/**
 * Memory management options for context awareness and event streaming
 */
export interface AgentMemoryOptions {
  /**
   * Agent context awareness options
   *
   * Controls how message history is managed and what context is included
   */
  context?: AgentContextAwarenessOptions;

  /**
   * Event stream options to configure the event stream behavior
   */
  eventStreamOptions?: AgentEventStream.ProcessorOptions;

  /**
   * Whether to enable streaming tool call events for debugging purposes.
   * When enabled, emits `assistant_streaming_tool_call` events during tool call construction.
   * This provides real-time visibility into tool call progress but adds processing overhead.
   *
   * @defaultValue `false`
   */
  enableStreamingToolCallEvents?: boolean;
}

/**
 * Metric configuration options for performance monitoring
 */
export interface AgentMetricOptions {
  /**
   * Whether to enable metric collection (TTFT, TTLT, etc.)
   * When disabled, timing metrics will not be collected or included in event streams.
   *
   * @defaultValue `false`
   */
  enable?: boolean;
}

/**
 * Miscellaneous configuration options for logging and debugging
 */
export interface AgentMiscOptions {
  /**
   * Log level setting for agent's logger. Controls verbosity of logs.
   *
   * @defaultValue `LogLevel.INFO` in development, `LogLevel.WARN` in production
   */
  logLevel?: LogLevel;

  /**
   * Metric collection settings
   */
  metric?: AgentMetricOptions;
}

/**
 * Workspace options for Agent, currently only required when you need to create an Agent
 * that involves file reading and writing, including file-system management, commands execution scope.
 */
export interface AgentWorkspaceOptions {
  /**
   * Directory to use for filesystem operations
   *
   * @defaultValue Defaults to current working directory if not specified
   */
  workspace?: string;
}

/**
 * Some setting options used to instantiate an Agent.
 */
export interface AgentOptions
  extends AgentBaseOptions,
    AgentModelOptions,
    AgentToolOptions,
    AgentLoopOptions,
    AgentMemoryOptions,
    AgentMiscOptions,
    AgentWorkspaceOptions {}

/**
 * Options for configuring agent context behavior (e.g. message history)
 */
export interface AgentContextAwarenessOptions {
  /**
   * Maximum number of images to include in the conversation history.
   *
   * When specified, this limits the total number of images in the context
   * to prevent context window overflow in LLM requests. Images beyond this limit
   * will be replaced with text placeholders that retain context information.
   *
   * This helps optimize token usage while preserving important conversation context.
   */
  maxImagesCount?: number;
}
