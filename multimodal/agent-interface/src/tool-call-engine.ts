/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentSingleLoopReponse } from './agent';
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageToolCall,
} from '@multimodal/model-provider/types';
import { ToolDefinition } from './tool';

/**
 * Finish reason
 */
export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'function_call';

/**
 * A interface to describe the parsed model reponse.
 */
export interface ParsedModelResponse {
  /**
   * Normal response content.
   */
  content: string;
  /**
   * Reasoning content.
   */
  reasoningContent?: string;
  /**
   * Tool calls.
   */
  toolCalls?: ChatCompletionMessageToolCall[];
  /**
   * Finish reason
   */
  finishReason?: FinishReason;
}

/**
 * Stream processing state for tool call engines
 */
export interface StreamProcessingState {
  /**
   * Current content buffer
   */
  contentBuffer: string;

  /**
   * Tool calls being constructed
   */
  toolCalls: ChatCompletionMessageToolCall[];

  /**
   * Reasoning content buffer
   */
  reasoningBuffer: string;

  /**
   * Current finish reason
   */
  finishReason: FinishReason | null;

  /**
   * Last successfully parsed content from JSON
   * Used to calculate incremental updates for structured outputs
   */
  lastParsedContent?: string;
}

/**
 * Result of processing a stream chunk
 */
export interface StreamChunkResult {
  /**
   * Content to add to the streaming message (may be empty if chunk was tool call related)
   */
  content: string;

  /**
   * Reasoning content to add (may be empty)
   */
  reasoningContent: string;

  /**
   * Whether this chunk contained a tool call update
   */
  hasToolCallUpdate: boolean;

  /**
   * Current state of tool calls (if any)
   */
  toolCalls: ChatCompletionMessageToolCall[];
}

/**
 * A interface describe the original tool call result.
 */
export interface ToolCallResult {
  /* tool call id, will return to llm */
  toolCallId: string;
  /* tool name */
  toolName: string;
  /* tool call result */
  content: any;
}

/**
 * A interface describe the parsed tool call result, supported "multimodal".
 */
export interface MultimodalToolCallResult {
  /* tool call id, will return to llm */
  toolCallId: string;
  /* tool name */
  toolName: string;
  /* parsed tool call result */
  content: ChatCompletionContentPart[];
}

export interface PrepareRequestContext {
  model: string;
  messages: ChatCompletionMessageParam[];
  tools?: ToolDefinition[];
  /**
   * Temperature used for LLM sampling, controlling randomness.
   * @default 0.7
   */
  temperature?: number;
}

/**
 * An experimental API for the underlying engine of Tool Call.
 *
 * In some LLMs that do not natively support Function Call, or in scenarios without OpenAI Compatibility,
 * you can switch to Prompt Engine to drive your Tool Call without changing any code.
 *
 * @experimental
 */
export abstract class ToolCallEngine {
  /**
   * Since the Tool Call Engine may need to customize the System Prompt,
   * this feature is used to open it to the Engine to support the insertion of additional System Prompt
   *
   * @param instructions System Prompt built into Agent Kernel
   * @param tools The tools currently activated by the Agent
   */
  abstract preparePrompt(instructions: string, tools: ToolDefinition[]): string;

  /**
   * Prepare a Chat Completion Request based on the current context
   *
   * In NativeToolCallEngine, Agent's tools defintions needs to be converted into the "tools" settings recognized by LLM.
   * In PromptToolengine, since the definition of Tool is already in System Prompt, it is generally not necessary to process.
   *
   * @param context input context
   */
  abstract prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams;

  /**
   * Initialize a new streaming processing state
   * This allows each engine to set up its specific tracking state
   *
   * @returns Initial processing state for this engine
   */
  abstract initStreamProcessingState(): StreamProcessingState;

  /**
   * Process a single streaming chunk in real-time
   * This allows engines to filter tool call tokens and extract information
   * as chunks arrive rather than waiting for complete responses
   *
   * @param chunk The current chunk to process
   * @param state Current accumulated state
   * @returns Processing result with filtered content and updated tool calls
   */
  abstract processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult;

  /**
   * Finalize the stream processing and return the complete parsed response
   * This is called when the stream is complete to clean up and finalize any
   * partial tool calls or content
   *
   * @param state Current accumulated state
   * @returns The final parsed response
   */
  abstract finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse;
  /**
   * Used to concatenate Assistant Messages that will be put into history
   *
   * @param currentLoopResponse current loop's response.
   */
  abstract buildHistoricalAssistantMessage(
    currentLoopResponse: AgentSingleLoopReponse,
  ): ChatCompletionMessageParam;

  /**
   * Used to concatenate tool call result messages that will be put into history and
   * used in the next loop.
   *
   * @param toolResults original tool call result.
   */
  abstract buildHistoricalToolCallResultMessages(
    toolResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[];
}

/**
 * Available tool call engine types
 */
export type ToolCallEngineType = 'native' | 'prompt_engineering' | 'structured_outputs';
