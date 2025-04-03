/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  BaseToolCallProvider,
  ToolCallResult,
  ProviderResponse,
  ToolResult,
} from './tool-call-provider';
import { zodToJsonSchema } from '../utils';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ToolDefinition,
} from '../types';

export class InstructionToolCallProvider extends BaseToolCallProvider {
  preparePrompt(instructions: string, tools: ToolDefinition[]): string {
    // If no tools, return original instructions
    if (!tools || tools.length === 0) {
      return instructions;
    }

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

To use a tool, your response MUST use the following format:

<thinking>
Your step-by-step reasoning about what tool to use and why
</thinking>

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

  prepareRequest(options: {
    model: string;
    messages: ChatCompletionMessageParam[];
    tools?: ToolDefinition[];
    temperature?: number;
  }) {
    const { model, messages, temperature = 0.7 } = options;

    // Claude doesn't use tool parameters, we've already included tools in the prompt
    return {
      model,
      messages,
      temperature,
      stream: false,
    };
  }

  async parseResponse(response: ProviderResponse): Promise<ToolCallResult> {
    const primaryChoice = response.choices[0];
    const content = primaryChoice.message.content || '';

    // Parse JSON tool calls
    const toolCalls = this.parseToolCallsFromContent(content);

    // If tool calls found, set finish_reason to "tool_calls"
    const finishReason = toolCalls.length > 0 ? 'tool_calls' : 'stop';

    // // If tool calls found, remove them from content
    // const cleanedContent =
    //   toolCalls.length > 0 ? this.removeToolCallsFromContent(content) : content;

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    };
  }

  private parseToolCallsFromContent(
    content: string,
  ): ChatCompletionMessageToolCall[] {
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Match <tool_call>...</tool_call> blocks
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;

    while ((match = toolCallRegex.exec(content)) !== null) {
      const toolCallContent = match[1].trim();

      try {
        // Try to parse JSON
        const toolCallData = JSON.parse(toolCallContent);

        if (toolCallData && toolCallData.name) {
          // Create OpenAI format tool call object
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: 'function',
            function: {
              name: toolCallData.name,
              arguments: JSON.stringify(toolCallData.parameters || {}),
            },
          });
        }
      } catch (error) {
        console.error('Failed to parse tool call JSON:', error);
        // Continue processing other potential tool calls
      }
    }

    return toolCalls;
  }

  private removeToolCallsFromContent(content: string): string {
    // Remove thinking parts
    let cleanedContent = content
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .trim();

    // Remove tool call parts
    cleanedContent = cleanedContent
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
      .trim();

    return cleanedContent;
  }

  formatAssistantMessage(
    content: string,
    toolCalls?: ChatCompletionMessageToolCall[],
  ): ChatCompletionMessageParam {
    // Claude doesn't support tool_calls field, only return content
    // Tool calls are already included in the content
    return {
      role: 'assistant',
      content: content,
    };
  }

  formatToolResultsMessage(
    toolResults: ToolResult[],
  ): ChatCompletionMessageParam[] {
    // For Claude, merge all tool results into a single user message
    const formattedResults = toolResults
      .map(
        (result) =>
          `Tool: ${result.toolName}\nResult: ${JSON.stringify(result.result, null, 2)}`,
      )
      .join('\n\n');

    return [
      {
        role: 'user',
        content: `Here are the results of the tool calls you requested:\n\n${formattedResults}`,
      },
    ];
  }
}
