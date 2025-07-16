/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineType } from './tool-call-engine';
import { Tool } from './tool';
import { ProviderOptions, LLMReasoningOptions } from '@multimodal/model-provider/types';
import { AgentEventStream } from './agent-event-stream';
import { LogLevel } from '@agent-infra/logger';

export { LogLevel };

/**
 * Base configuration options for agent identity and behavior
 */
export interface AgentBaseOptions {
  /**
   * Optional unique identifier for this agent instance.
   * Useful for tracking and logging purposes.
   *
   * @defaultValue `"@multimodal/agent"`
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
   *
   * @defaultValue `undefined`
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
   * Used to control the reasoning content.
   */
  thinking?: LLMReasoningOptions;
}

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
   *
   * @defaultValue `50`
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
 * Miscellaneous configuration options for logging and debugging
 */
export interface AgentMiscOptions {
  /**
   * Log level setting for agent's logger. Controls verbosity of logs.
   *
   * @defaultValue `LogLevel.INFO` in development, `LogLevel.WARN` in production
   */
  logLevel?: LogLevel;
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
    AgentMiscOptions {}

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
