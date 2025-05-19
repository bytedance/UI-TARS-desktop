/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  type ToolDefinition,
  type ParsedModelResponse,
  ToolCallEngine,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
} from '../types';
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from '../types/third-party';

import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { parseResponse } from './shared';

/**
 * A Tool Call Engine based on prompt engineering.
 */
export class PromptEngineeringToolCallEngine extends ToolCallEngine {
  private logger = getLogger('PromptEngine');

  preparePrompt(instructions: string, tools: ToolDefinition[]): string {
    // If no tools, return original instructions
    if (!tools || tools.length === 0) {
      return instructions;
    }

    this.logger.info(`Preparing prompt with ${tools.length} tools`);

    // Create clearer tool format for instruction-based models
    const toolsDescription = tools
      .map((tool) => {
        const schema = zodToJsonSchema(tool.schema);
        const properties = schema.properties || {};
        const requiredProps = schema.required || [];

        const paramsDescription = Object.entries(properties)
          .map(([name, prop]: [string, any]) => {
            const isRequired = requiredProps.includes(name);
            return `- ${name}${isRequired ? ' (required)' : ''}: ${prop.description || 'No description'} (type: ${prop.type})`;
          })
          .join('\n');

        return `## ${tool.name}

Description: ${tool.description}

Parameters:
${paramsDescription || 'No parameters required'}`;
      })
      .join('\n\n');

    // Use clearer JSON format instructions and add conversation format guidance
    return `${instructions}

You have access to the following tools:

${toolsDescription}

To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string:

<tool_call>
{
  "name": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
</tool_call>

If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.

When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
`;
  }

  prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams {
    const { model, messages, temperature = 0.7 } = context;

    this.logger.debug(`Preparing request for model: ${model}`);

    // Claude doesn't use tool parameters, we've already included tools in the prompt
    return {
      model,
      messages,
      temperature,
      stream: false,
    };
  }

  async parseResponse(response: ChatCompletion): Promise<ParsedModelResponse> {
    const parsedResponse = parseResponse(response);

    const toolCalls = this.parseToolCallsFromContent(parsedResponse.content);
    parsedResponse.toolCalls = toolCalls;

    const finishReason = toolCalls.length > 0 ? 'tool_calls' : 'stop';
    parsedResponse.finishReason = finishReason;
    return parsedResponse;
  }

  private parseToolCallsFromContent(content: string): ChatCompletionMessageToolCall[] {
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Match <tool_call>...</tool_call> blocks
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      const toolCallContent = match[1].trim();
      console.log('toolCallContent', toolCallContent);

      try {
        // Try to parse JSON
        const toolCallData = JSON.parse(toolCallContent);

        if (toolCallData && toolCallData.name) {
          // Create OpenAI format tool call object
          const toolCallId = process.env.TEST
            ? `call_1747633091730_6m2magifs`
            : `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          toolCalls.push({
            id: toolCallId,
            type: 'function',
            function: {
              name: toolCallData.name,
              arguments: JSON.stringify(toolCallData.parameters || {}),
            },
          });
          this.logger.debug(`Found tool call: ${toolCallData.name} with ID: ${toolCallId}`);
        }
      } catch (error) {
        this.logger.error('Failed to parse tool call JSON:', error);
        // Continue processing other potential tool calls
      }
    }

    return toolCalls;
  }

  private removeToolCallsFromContent(content: string): string {
    // Remove thinking parts
    let cleanedContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

    // Remove tool call parts
    cleanedContent = cleanedContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

    return cleanedContent;
  }

  buildHistoricalAssistantMessage(
    currentLoopResponse: AgentSingleLoopReponse,
  ): ChatCompletionMessageParam {
    const { content } = currentLoopResponse;
    // Claude doesn't support tool_calls field, only return content
    // Tool calls are already included in the content
    return {
      role: 'assistant',
      content: content,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    if (toolCallResults.length === 0) {
      return [];
    }

    this.logger.debug(`Building ${toolCallResults.length} tool call result messages`);

    const messages: ChatCompletionMessageParam[] = [];

    // Process each tool call result, split into multiple messages
    for (const result of toolCallResults) {
      // Check if content contains non-text elements (like images)
      const hasNonTextContent = result.content.some((part) => part.type !== 'text');

      // Extract plain text content
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      // Create message containing tool name and text result
      messages.push({
        role: 'user',
        content: `Tool: ${result.toolName}\nResult:\n${textContent}`,
      });

      // If there is non-text content (like images), add an additional user message
      if (hasNonTextContent) {
        const nonTextContent = result.content.filter((part) => part.type !== 'text');
        if (nonTextContent.length > 0) {
          this.logger.debug(`Adding non-text content message for tool: ${result.toolName}`);
          messages.push({
            role: 'user',
            content: nonTextContent,
          });
        }
      }
    }

    return messages;
  }
}
