/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionContentPart, ModelProviderName } from '@tarko/model-provider/types';
import { ToolCallEngineType } from './tool-call-engine';

/**
 * Context type definition for dynamic context injection
 */
export interface AgentContext {
  /** Unique identifier for this context */
  id: string;
  /** Type of context being injected */
  type: 'file' | 'directory' | 'workspace' | 'custom';
  /** The actual context content (can be multimodal) */
  content: string | ChatCompletionContentPart[];
  /** Optional description of the context */
  description?: string;
  /** Additional metadata about the context */
  metadata?: {
    /** File or directory path */
    path?: string;
    /** Display name */
    name?: string;
  } & Record<string, unknown>;
}

/**
 * Base options for running an agent without specifying streaming mode
 */
export interface AgentRunBaseOptions {
  /**
   * Multimodal message.
   */
  input: string | ChatCompletionContentPart[];
  /**
   * Model id used to run the agent.
   *
   * @defaultValue "model.id" or the first configured "model.providers."
   */
  model?: string;
  /**
   * Model provider used to run the agent.
   *
   * @defaultValue "model.provider" or the first configured "model.providers."
   */
  provider?: ModelProviderName;
  /**
   * Optional session identifier to track the agent loop conversation
   * If not provided, a random ID will be generated
   */
  sessionId?: string;
  /**
   * Tool Call Engine configuration - supports both predefined engines and custom constructors.
   *
   * @defaultValue "toolCallEngine" in agent options
   */
  toolCallEngine?: ToolCallEngineType;
  /**
   * Abort signal for canceling the execution
   * @internal This is set internally by the Agent class
   */
  abortSignal?: AbortSignal;
  /**
   * Dynamic contexts to inject into the agent execution
   * These will be processed as environment_input events
   */
  contexts?: AgentContext[];
}

/**
 * Object options for running agent in non-streaming mode
 */
export interface AgentRunNonStreamingOptions extends AgentRunBaseOptions {
  stream?: false;
}

/**
 * Object options for running agent in streaming mode
 */
export interface AgentRunStreamingOptions extends AgentRunBaseOptions {
  stream: true;
}

/**
 * Combined type for all object-based run options
 */
export type AgentRunObjectOptions = AgentRunNonStreamingOptions | AgentRunStreamingOptions;

/**
 * Agent run options - either a string or an options object
 */
export type AgentRunOptions = string /* text prompt */ | AgentRunObjectOptions;

/**
 * Type guard function to check if an AgentRunOptions is an AgentRunObjectOptions
 * @param options - The options to check
 * @returns True if the options is an AgentRunObjectOptions, false otherwise
 */
export function isAgentRunObjectOptions(
  options: AgentRunOptions,
): options is AgentRunObjectOptions {
  return typeof options !== 'string' && 'input' in options;
}

/**
 * Type guard to check if options specify streaming mode
 * @param options - The options to check
 * @returns True if streaming mode is enabled
 */
export function isStreamingOptions(
  options: AgentRunObjectOptions,
): options is AgentRunStreamingOptions {
  return options.stream === true;
}
