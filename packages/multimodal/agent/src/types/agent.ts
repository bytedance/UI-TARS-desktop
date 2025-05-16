/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngineType } from './tool-call-engine';
import { ModelProviderName, ModelSetting } from './model';
import { ToolDefinition } from './tool';
import {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionChunk,
} from './third-party';
import { EventStreamOptions } from './event-stream';

/**
 * Some setting options used to instantiate an Agent.
 */
export interface AgentOptions {
  /**
   * Model settings.
   *
   * @defaultValue {undefined}
   */
  model?: ModelSetting;

  /**
   * Optional unique identifier for this agent instance.
   * Useful for tracking and logging purposes.
   *
   * @defaultValue undefined
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

  /**
   * Maximum number of iterations of the agent.
   *
   * @defaultValue `50`
   */
  maxIterations?: number;

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
   * Agent tools defintion
   *
   * @defaultValue `undefined`
   */
  tools?: ToolDefinition[];

  /**
   * An experimental API for the underlying engine of Tool Call.
   *
   * In some LLMs that do not natively support Function Call, or in scenarios without OpenAI Compatibility,
   * you can switch to Prompt Engineering Engine to drive your Tool Call without changing any code.
   *
   * @defaultValue `'native'`
   */
  tollCallEngine?: ToolCallEngineType;

  /**
   * Used to control the reasoning content.
   */
  thinking?: AgentReasoningOptions;

  /**
   * Event stream options to configure the event stream behavior
   */
  eventStreamOptions?: EventStreamOptions;
}

/**
 * Agent reasoning options
 */
export interface AgentReasoningOptions {
  /**
   * Whether to enable reasoning
   *
   * @defaultValue {'disabled'}.
   *
   * @compatibility Supported models: 'claude', 'doubao-1.5-thinking'
   */
  type?: 'disabled' | 'enabled';

  /**
   * The `budgetTokens` parameter determines the maximum number of tokens
   * Model is allowed to use for its internal reasoning process.
   *
   * @compatibility Supported models: 'claude'.
   */
  budgetTokens?: number;
}

/**
 * Object options used to run a agent.
 */
export interface AgentRunObjectOptions {
  /**
   * Multimodal message.
   */
  input: string | ChatCompletionContentPart[];
  /**
   * Model id used to run the agent.
   *
   * @defaultValue "model.use" or the first configured "model.providers."
   */
  model?: string;
  /**
   * Model provider used to run the agent.
   *
   * @defaultValue "model.use" or the first configured "model.providers."
   */
  provider?: ModelProviderName;
  /**
   * Optional session identifier to track the agent loop conversation
   * If not provided, a random ID will be generated
   */
  sessionId?: string;
  /**
   * An experimental API for the underlying engine of Tool Call.
   *
   * @defaultValue "tollCallEngine" in agent options
   */
  tollCallEngine?: ToolCallEngineType;
  /**
   * Enable streaming mode to receive incremental responses
   *
   * @defaultValue false
   */
  stream?: boolean;
}

/**
 * Agent run options.
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

/**
 * Merged llm request, including reasoning parameters.
 */
export type LLMRequest = ChatCompletionMessageParam & {
  /**
   * Agent reasoning options
   */
  thinking?: AgentReasoningOptions;
};

/**
 * Type for LLM request hook payload - containing all information about the request
 */
export interface LLMRequestHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete request parameters
   */
  request: LLMRequest;
  /**
   * The requested base url
   */
  baseURL?: string;
}

/**
 * Type for LLM response hook payload
 */
export interface LLMResponseHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete model response
   */
  response: ChatCompletion;
}

/**
 * Type for streaming response with message chunk
 */
export interface AgentStreamingResponse {
  type: 'message' | 'thinking';
  content: string;
  isComplete?: boolean;
  toolCalls?: Partial<ChatCompletionMessageToolCall>[];
  finishReason?: string | null;
}

/**
 * Type for LLM response hook payload - streaming version
 */
export interface LLMStreamingResponseHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete stream of chunks
   */
  chunks: ChatCompletionChunk[];
}
