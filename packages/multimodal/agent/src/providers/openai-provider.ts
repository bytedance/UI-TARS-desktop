/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { zodToJsonSchema } from '../utils';
import {
  BaseToolCallProvider,
  ToolCallResult,
  ProviderResponse,
  ToolResult,
} from './tool-call-provider';
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
  ToolDefinition,
  ChatCompletionMessageToolCall,
} from '../types';

export class OpenAIToolCallProvider extends BaseToolCallProvider {
  preparePrompt(instructions: string, tools: ToolDefinition[]): string {
    // OpenAI doesn't need special prompt formatting for tools
    return instructions;
  }

  prepareRequest(options: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: ToolDefinition[];
    temperature?: number;
  }) {
    const { model, messages, tools, temperature = 0.7 } = options;

    // Convert tool definitions to OpenAI format
    const openAITools = tools?.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        // Use zodToJsonSchema which now handles both Zod and JSON schemas
        parameters: zodToJsonSchema(tool.schema),
      },
    }));

    return {
      model,
      messages,
      tools: openAITools,
      temperature,
      stream: false,
    };
  }

  async parseResponse(response: ProviderResponse): Promise<ToolCallResult> {
    const primaryChoice = response.choices[0];
    const content = primaryChoice.message.content || '';
    let toolCalls = undefined;

    // Check if tool_calls exists in the primary choice
    if (
      primaryChoice.message.tool_calls &&
      primaryChoice.message.tool_calls.length > 0
    ) {
      toolCalls = primaryChoice.message.tool_calls;
    }

    return {
      content,
      toolCalls,
      finishReason: primaryChoice.finish_reason,
    };
  }

  formatAssistantMessage(
    content: string,
    toolCalls?: ChatCompletionMessageToolCall[],
  ): ChatCompletionMessageParam {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: content,
    };

    // For OpenAI, directly use the tool_calls field
    if (toolCalls && toolCalls.length > 0) {
      message.tool_calls = toolCalls;
    }

    return message;
  }

  formatToolResultsMessage(
    toolResults: ToolResult[],
  ): ChatCompletionMessageParam[] {
    // Create a tool response message for each tool call
    return toolResults.map<ChatCompletionToolMessageParam>((result) => {
      return {
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: JSON.stringify(result.result),
      };
    });
  }
}
