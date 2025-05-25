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
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  FunctionParameters,
  ChatCompletion,
  StreamProcessingState,
  StreamChunkResult,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';
import { buildToolCallResultMessages } from './utils';

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

  /**
   * Initialize stream processing state for native tool calls
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
   * Process a streaming chunk for native tool calls
   * For native engines, we can directly use the tool_calls property
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
      content = delta.content;
      state.contentBuffer += content;
    }

    // Process tool calls if present - native engine handles this automatically
    if (delta?.tool_calls) {
      hasToolCallUpdate = true;
      this.processToolCallsInChunk(delta.tool_calls, state.toolCalls);
    }

    return {
      content,
      reasoningContent,
      hasToolCallUpdate,
      toolCalls: state.toolCalls,
    };
  }

  /**
   * Process tool calls data from a chunk
   */
  private processToolCallsInChunk(
    toolCallParts: ChatCompletionChunk.Choice.Delta.ToolCall[],
    currentToolCalls: ChatCompletionMessageToolCall[],
  ): void {
    for (const toolCallPart of toolCallParts) {
      const toolCallIndex = toolCallPart.index;

      // Ensure the tool call exists in our buffer
      if (!currentToolCalls[toolCallIndex]) {
        currentToolCalls[toolCallIndex] = {
          id: toolCallPart.id!,
          type: toolCallPart.type!,
          function: {
            name: '',
            arguments: '',
          },
        };
      }

      // Update function name if present
      if (toolCallPart.function?.name) {
        currentToolCalls[toolCallIndex].function!.name = toolCallPart.function.name;
      }

      // Append arguments if present
      if (toolCallPart.function?.arguments) {
        currentToolCalls[toolCallIndex].function!.arguments =
          (currentToolCalls[toolCallIndex].function!.arguments || '') +
          toolCallPart.function.arguments;
      }
    }
  }

  /**
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return {
      content: state.contentBuffer,
      reasoningContent: state.reasoningBuffer || undefined,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      finishReason: state.finishReason || 'stop',
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
    return buildToolCallResultMessages(toolCallResults, true);
  }
}
