/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageToolCall,
  ChatCompletionAssistantMessageParam,
} from '@tarko/model-provider/types';
import { Tool } from './tool';
import { AgentEventStream } from './agent-event-stream';

/**
 * Constructor type for Tool Call Engine
 */
export type TConstructor<T, U extends unknown[] = unknown[]> = new (...args: U) => T;

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
   *
   * In scenarios other than the native tool call engine,
   * this may be the processed value.
   */
  content: string;
  /**
   * Original content.
   *
   * In some scenarios where custom parsing model output is required.
   * This value is very useful for building Message History.
   */
  rawContent?: string;
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

  /**
   * Streaming tool call updates for this chunk
   * Contains delta information for real-time tool call construction
   */
  streamingToolCallUpdates?: StreamingToolCallUpdate[];
}

/**
 * Information about streaming tool call updates
 */
export interface StreamingToolCallUpdate {
  /** Tool call ID */
  toolCallId: string;

  /** Tool name (may be empty if still being constructed) */
  toolName: string;

  /** Delta arguments - only the incremental part */
  argumentsDelta: string;

  /** Whether this tool call is complete */
  isComplete: boolean;
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

export interface ToolCallEnginePrepareRequestContext {
  model: string;
  messages: ChatCompletionMessageParam[];
  tools?: Tool[];
  /**
   * Temperature used for LLM sampling, controlling randomness.
   * @default 0.7
   */
  temperature?: number;
  /**
   * Top-p (nucleus) sampling parameter for LLM text generation.
   * Controls the cumulative probability threshold for token selection.
   * Range: 0.0 to 1.0.
   */
  top_p?: number;
}

/**
 * An experimental API for the underlying engine of Tool Call.
 *
 * In some LLMs that do not natively support Function Call, or in scenarios without OpenAI Compatibility,
 * you can switch to Prompt Engine to drive your Tool Call without changing any code.
 *
 * @experimental
 */
export abstract class ToolCallEngine<T extends StreamProcessingState = StreamProcessingState> {
  /**
   * Since the Tool Call Engine may need to customize the System Prompt,
   * this feature is used to open it to the Engine to support the insertion of additional System Prompt
   *
   * @param instructions System Prompt built into Agent Kernel
   * @param tools The tools currently activated by the Agent
   */
  abstract preparePrompt(instructions: string, tools: Tool[]): string | string[];

  /**
   * Prepare a Chat Completion Request based on the current context
   *
   * In NativeToolCallEngine, Agent's tools defintions needs to be converted into the "tools" settings recognized by LLM.
   * In PromptToolengine, since the definition of Tool is already in System Prompt, it is generally not necessary to process.
   *
   * @param context input context
   */
  abstract prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams;

  /**
   * Initialize a new streaming processing state
   * This allows each engine to set up its specific tracking state
   *
   * @returns Initial processing state for this engine
   */
  abstract initStreamProcessingState(): T;

  /**
   * Process a single streaming chunk in real-time
   * This allows engines to filter tool call tokens and extract information
   * as chunks arrive rather than waiting for complete responses
   *
   * @param chunk The current chunk to process
   * @param state Current accumulated state
   * @returns Processing result with filtered content and updated tool calls
   */
  abstract processStreamingChunk(chunk: ChatCompletionChunk, state: T): StreamChunkResult;

  /**
   * Finalize the stream processing and return the complete parsed response
   * This is called when the stream is complete to clean up and finalize any
   * partial tool calls or content
   *
   * @param state Current accumulated state
   * @returns The final parsed response
   */
  abstract finalizeStreamProcessing(state: T): ParsedModelResponse;
  /**
   * Used to concatenate Assistant Messages that will be put into history
   *
   * @param currentLoopAssistantEvent current loop's assistant event.
   */
  abstract buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam;

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
 * Available tool call engine types - now supports both string identifiers and constructors
 */
export type ToolCallEngineType =
  | 'native'
  | 'prompt_engineering'
  | 'structured_outputs'
  | TConstructor<ToolCallEngine>;
