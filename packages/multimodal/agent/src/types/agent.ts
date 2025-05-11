/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngine, ToolCallEngineType } from './tool-call-engine';
import { ModelSetting } from './model';
import { ToolDefinition } from './tool';
import { ChatCompletionContentPart, ChatCompletionMessageToolCall } from './third-party';

/**
 * Some setting options used to instantiate an Agent.
 */
export interface AgentOptions {
  /**
   * Used to define the Agent's system prompt.
   */
  instructions?: string;

  /**
   * Model settings.
   */
  model: ModelSetting;

  /**
   * Agent tools defintion
   */
  tools?: ToolDefinition[];

  /**
   * An experimental API for the underlying engine of Tool Call.
   *
   * In some LLMs that do not natively support Function Call, or in scenarios without OpenAI Compatibility,
   * you can switch to Prompt Engineering Engine to drive your Tool Call without changing any code.
   *
   * @experimental
   */
  tollCallEngine?: ToolCallEngineType;

  /**
   * Maximum number of iterations of the agent.
   */
  maxIterations?: number;

  /**
   * Agent's name, useful for tracing.
   */
  name?: string;

  /**
   * Temperature used for LLM sampling, controlling randomness.
   * Lower values make the output more deterministic (e.g., 0.1).
   * Higher values make the output more random/creative (e.g., 1.0).
   * @default 0.7
   */
  temperature?: number;
}

/**
 * Options used to run a agent.
 */
export interface AgentRunObjectOptions {
  /**
   * Multimodal message.
   */
  input: string | ChatCompletionContentPart[];
  /**
   * Model id used to run the agent.
   */
  model?: string;
  /**
   * Model provider used to run the agent.
   */
  provider?: string;
}

export type AgentRunOptions = string | AgentRunObjectOptions;

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
 * An interface used to describe the output of a single run of the Agent.
 */
export interface AgentSingleLoopReponse {
  /**
   * Assistent's response
   *
   * FIXME: Support multimodal output.
   */
  content: string;
  /**
   * Tool calls.
   */
  toolCalls?: ChatCompletionMessageToolCall[];
}
