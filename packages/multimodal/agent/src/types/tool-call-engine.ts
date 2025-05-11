/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionMessageToolCall,
} from './third-party';
import { ToolDefinition } from './tool';

export type ModelResponse = ChatCompletion;

export interface ToolCallResult {
  content: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason?: string;
}

/**
 * Define interface for tool result
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
}

export interface PrepareRequestContext {
  model: string;
  messages: ChatCompletionMessageParam[];
  tools?: ToolDefinition[];
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
   * In FCToolCallEngine, Agent's tools defintions needs to be converted into the "tools" settings recognized by LLM.
   * In PromptToolengine, since the definition of Tool is already in System Prompt, it is generally not necessary to process.
   *
   * @param context input context
   */
  abstract prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams;

  /**
   * Used to parse model's Response.
   *
   * In FCToolCallEngine, we can easily get the output of the tool call because the model has been processed.
   * In PromptToolengine, We need to manually parse the call output by the tool.
   *
   * @param response
   */
  abstract parseResponse(response: ModelResponse): Promise<ToolCallResult>;
  abstract formatAssistantMessage(
    content: string,
    toolCalls?: ChatCompletionMessageToolCall[],
  ): ChatCompletionMessageParam;
  abstract formatToolResultsMessage(toolResults: ToolResult[]): ChatCompletionMessageParam[];
}
