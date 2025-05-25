/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolDefinition,
  ToolCallEngine,
  ParsedModelResponse,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageToolCall,
  StreamProcessingState,
  StreamChunkResult,
} from '@multimodal/agent-interface';

import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { isTest } from '../utils/env';
import { buildToolCallResultMessages } from './utils';

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

  /**
   * Initialize stream processing state for prompt engineering tool calls
   */
  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
    };
  }

  /**
   * Process a streaming chunk for prompt engineering tool calls
   * This implementation filters <tool_call> tags in real-time
   */
  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;
    let content = '';
    let reasoningContent = '';
    let hasToolCallUpdate = false;

    // Extract finish reason if present
    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    // Process reasoning content if present
    // @ts-expect-error Not in OpenAI types but present in compatible LLMs
    if (delta?.reasoning_content) {
      // @ts-expect-error
      reasoningContent = delta.reasoning_content;
      state.reasoningBuffer += reasoningContent;
    }

    // Process regular content if present
    if (delta?.content) {
      const newContent = delta.content;
      state.contentBuffer += newContent;

      // Check if we're currently building a complete tool call
      const updatedBuffer = state.contentBuffer;

      // If we've received a complete tool call tag, process it
      if (this.hasCompletedToolCall(updatedBuffer)) {
        const { cleanedContent, extractedToolCalls } = this.extractToolCalls(updatedBuffer);

        // Update state with cleaned content (without tool call tags)
        state.contentBuffer = cleanedContent;

        // Add extracted tool calls to state
        if (extractedToolCalls.length > 0) {
          state.toolCalls = extractedToolCalls;
          hasToolCallUpdate = true;

          // For prompt engineering, we return empty content since we've filtered it
          return {
            content: '', // Don't send the tool call tag in content
            reasoningContent,
            hasToolCallUpdate,
            toolCalls: state.toolCalls,
          };
        }
      }

      // Check if this chunk is part of a tool call tag
      if (this.isPartOfToolCallTag(updatedBuffer)) {
        // Don't include content that is part of a tool call tag
        content = '';
      } else {
        content = newContent;
      }
    }

    return {
      content,
      reasoningContent,
      hasToolCallUpdate,
      toolCalls: state.toolCalls,
    };
  }

  /**
   * Check if content contains a complete tool call
   */
  private hasCompletedToolCall(content: string): boolean {
    return content.includes('<tool_call>') && content.includes('</tool_call>');
  }

  /**
   * Check if the current buffer is part of a tool call tag
   * This helps us filter out content that's part of a tool call
   */
  private isPartOfToolCallTag(content: string): boolean {
    // If we have an opening tag but no closing tag yet
    if (content.includes('<tool_call>') && !content.includes('</tool_call>')) {
      return true;
    }

    // If we're in the middle of an opening or closing tag
    const partialOpenTag = '<tool_call';
    const partialCloseTag = '</tool_call';

    for (let i = 1; i <= partialOpenTag.length; i++) {
      if (content.endsWith(partialOpenTag.substring(0, i))) {
        return true;
      }
    }

    for (let i = 1; i <= partialCloseTag.length; i++) {
      if (content.endsWith(partialCloseTag.substring(0, i))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract tool calls from content and return cleaned content
   */
  private extractToolCalls(content: string): {
    cleanedContent: string;
    extractedToolCalls: ChatCompletionMessageToolCall[];
  } {
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Match <tool_call>...</tool_call> blocks
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;
    let cleanedContent = content;

    while ((match = toolCallRegex.exec(content)) !== null) {
      const toolCallContent = match[1].trim();

      try {
        // Try to parse JSON
        const toolCallData = JSON.parse(toolCallContent);

        if (toolCallData && toolCallData.name) {
          // Create OpenAI format tool call object
          const toolCallId = isTest()
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

    // Remove all tool call blocks from content
    cleanedContent = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

    return { cleanedContent, extractedToolCalls: toolCalls };
  }

  /**
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    // Do one final extraction in case there are completed tool calls
    if (this.hasCompletedToolCall(state.contentBuffer)) {
      const { cleanedContent, extractedToolCalls } = this.extractToolCalls(state.contentBuffer);
      state.contentBuffer = cleanedContent;

      if (extractedToolCalls.length > 0) {
        state.toolCalls = extractedToolCalls;
      }
    }

    const finishReason = state.toolCalls.length > 0 ? 'tool_calls' : state.finishReason || 'stop';

    return {
      content: state.contentBuffer,
      reasoningContent: state.reasoningBuffer || undefined,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      finishReason,
    };
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
    return buildToolCallResultMessages(toolCallResults, false);
  }
}
