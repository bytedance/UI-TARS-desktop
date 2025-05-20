/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import {
  ToolDefinition,
  ToolCallEngine,
  ParsedModelResponse,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  ChatCompletionTool,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  FunctionParameters,
  ChatCompletion,
} from '@multimodal/agent-interface';
import { parseResponse } from './shared';

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
      // Only set tools field when `tools` config exists, or we woul got following error:
      // API error: InputError: Detected a 'tools' parameter,
      // but the following model does not support tools: gpt-image-1
      tools: openAITools.length > 0 ? openAITools : undefined,
      temperature,
      stream: false,
    };
  }

  async parseResponse(response: ChatCompletion): Promise<ParsedModelResponse> {
    return parseResponse(response);
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
      // but only with the non-text content (to avoid duplication)
      if (hasNonTextContent) {
        this.logger.debug(`Adding non-text content message for tool result: ${result.toolName}`);

        // Only include non-text parts to avoid duplication
        const nonTextParts = result.content.filter((part) => part.type !== 'text');

        messages.push({
          role: 'user',
          content: nonTextParts,
        });
      }
    }

    return messages;
  }
}
