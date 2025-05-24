/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentSingleLoopReponse } from './agent';
import type {
  ChatCompletion,
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageToolCall,
} from './third-party';
import { ToolDefinition } from './tool';

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
  finishReason?: string;
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
   * Parse model's Response.
   *
   * In NativeToolCallEngine, we can easily get the output of the tool call because the model has been processed.
   * In PromptToolengine, We need to manually parse the call output by the tool.
   *
   * @param response orignal model chat completion response
   * @returns pasred response
   */
  abstract parseResponse(response: ChatCompletion): Promise<ParsedModelResponse>;

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
