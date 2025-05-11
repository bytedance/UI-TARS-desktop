/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { zodToJsonSchema } from '../utils';
import { ToolCallEngine } from '../types';
import { getLogger } from '../utils/logger';
import type {
  ModelResponse,
  ToolDefinition,
  ParsedModelResponse,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
} from '../types';
import type {
  ChatCompletionTool,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionCreateParams,
  FunctionParameters,
  ChatCompletionContentPart,
} from '../types/third-party';

/**
 * A Tool Call Engine based on native Function Call.
 */
export class NativeToolCallEngine extends ToolCallEngine {
  private logger = getLogger('NativeEngine');

  preparePrompt(instructions: string, tools: ToolDefinition[]): string {
    // Function call doesn't need special prompt formatting for tools
    return instructions;
  }

  prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams {
    const { model, messages, tools, temperature = 0.7 } = context;

    if (!tools) {
      this.logger.debug(`Preparing request for model: ${model} without tools`);
      return {
        model,
        messages,
        temperature,
        stream: false,
      };
    }

    // Convert tool definitions to OpenAI format
    this.logger.debug(`Preparing request for model: ${model} with ${tools.length} tools`);
    const openAITools = tools.map<ChatCompletionTool>((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        // Use zodToJsonSchema which now handles both Zod and JSON schemas
        parameters: zodToJsonSchema(tool.schema) as FunctionParameters,
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

  async parseResponse(response: ModelResponse): Promise<ParsedModelResponse> {
    const primaryChoice = response.choices[0];
    const content = primaryChoice.message.content || '';
    let toolCalls = undefined;

    // Check if tool_calls exists in the primary choice
    if (primaryChoice.message.tool_calls && primaryChoice.message.tool_calls.length > 0) {
      toolCalls = primaryChoice.message.tool_calls;
      this.logger.debug(`Found ${toolCalls.length} tool calls in response`);
    }

    return {
      content,
      toolCalls,
      finishReason: primaryChoice.finish_reason,
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopResponse: AgentSingleLoopReponse,
  ): ChatCompletionMessageParam {
    const { content, toolCalls } = currentLoopResponse;
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: content,
    };

    // For OpenAI, directly use the tool_calls field
    if (toolCalls && toolCalls.length > 0) {
      message.tool_calls = toolCalls;
      this.logger.debug(`Adding ${toolCalls.length} tool calls to assistant message`);
    }

    return message;
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    // Create message array
    const messages: ChatCompletionMessageParam[] = [];

    this.logger.debug(
      `Building historical messages for ${toolCallResults.length} tool call results`,
    );

    // Process each tool call result
    for (const result of toolCallResults) {
      // Check if content contains non-text elements (like images)
      const hasNonTextContent = result.content.some((part) => part.type !== 'text');

      // Extract plain text content for tool message
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      // Always add standard tool result message (text content only)
      messages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: textContent,
      });

      // If there's non-text content (like images), add an extra user message
      if (hasNonTextContent) {
        this.logger.debug(`Adding non-text content message for tool result: ${result.toolName}`);
        messages.push({
          role: 'user',
          content: result.content,
        });
      }
    }

    return messages;
  }
}
