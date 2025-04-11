/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ToolDefinition,
} from '../types';
import type { OpenAI } from 'openai';
import type { ChatCompletion } from 'openai/resources';

export interface ToolCallResult {
  content: string;
  toolCalls?: ChatCompletionMessageToolCall[];
  finishReason?: string;
}

// Define interface for tool result
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: any;
}

// Define generic response type interface
export type ProviderResponse = ChatCompletion;

export interface ToolCallProvider {
  preparePrompt(instructions: string, tools: ToolDefinition[]): string;
  prepareRequest(options: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: ToolDefinition[];
    temperature?: number;
  }): any;
  parseResponse(response: ProviderResponse): Promise<ToolCallResult>;

  // New method: construct assistant message
  formatAssistantMessage(
    content: string,
    toolCalls?: ChatCompletionMessageToolCall[],
  ): ChatCompletionMessageParam;

  // New method: construct tool result messages - return type changed to array
  formatToolResultsMessage(
    toolResults: ToolResult[],
  ): ChatCompletionMessageParam[];
}

export abstract class BaseToolCallProvider implements ToolCallProvider {
  constructor() {}

  abstract preparePrompt(instructions: string, tools: ToolDefinition[]): string;
  abstract prepareRequest(options: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: ToolDefinition[];
    temperature?: number;
  }): any;
  abstract parseResponse(response: ProviderResponse): Promise<ToolCallResult>;
  abstract formatAssistantMessage(
    content: string,
    toolCalls?: ChatCompletionMessageToolCall[],
  ): ChatCompletionMessageParam;
  abstract formatToolResultsMessage(
    toolResults: ToolResult[],
  ): ChatCompletionMessageParam[];
}
