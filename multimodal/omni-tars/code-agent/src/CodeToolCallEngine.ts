/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseCodeContent } from '@omni-tars/core';
import { ToolCallEngine, Tool, getLogger } from '@tarko/agent';
import {
  ToolCallEnginePrepareRequestContext,
  StreamProcessingState,
  StreamChunkResult,
  ParsedModelResponse,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  MultimodalToolCallResult,
  AgentEventStream,
} from '@tarko/agent-interface';

/**
 * Code execution optimized tool call engine
 */
export class CodeToolCallEngine extends ToolCallEngine {
  private logger = getLogger('CodeToolCallEngine');

  preparePrompt(instructions: string, tools: Tool[]): string {
    return instructions;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: context.temperature || 1.0,
      top_p: context.top_p,
      stream: true,
      // For OpenAI standard stop sequence API.
      // stop: ['</code_env>', '</mcp_env>'],
      // stop_sequences: ['</code_env>', '</mcp_env>'],
    };
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;

    // Accumulate content
    if (delta?.content) {
      state.contentBuffer += delta.content;
    }

    // Record finish reason
    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    // Return incremental content without tool call detection during streaming
    return {
      // content: delta?.content || '',
      content: '',
      reasoningContent: '',
      hasToolCallUpdate: false,
      toolCalls: [],
    };
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    const fullContent = state.contentBuffer;
    this.logger.info('finalizeStreamProcessing content \n', fullContent);

    const extracted = parseCodeContent(fullContent);

    this.logger.info('extracted', JSON.stringify(extracted, null, 2));

    const { think, tools, answer } = extracted;

    return {
      content: answer ?? fullContent,
      rawContent: fullContent,
      reasoningContent: think ?? '',
      toolCalls: tools,
      finishReason: tools.length > 0 ? 'tool_calls' : 'stop',
    };
  }

  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return {
      role: 'assistant',
      content: currentLoopAssistantEvent.rawContent || currentLoopAssistantEvent.content,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return toolCallResults.map((result) => {
      // Extract text content from multimodal result
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      return {
        role: 'user',
        content: `Tool "${result.toolName}" result:\n${textContent}`,
      };
    });
  }
}
