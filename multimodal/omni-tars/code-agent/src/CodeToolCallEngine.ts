/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  parseCodeContent,
  processStreamingChunk as omniProcessStreamingChunk,
  OmniStreamProcessingState,
  createInitState,
} from '@omni-tars/core';
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
export class CodeToolCallEngine extends ToolCallEngine<OmniStreamProcessingState> {
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

  initStreamProcessingState(): OmniStreamProcessingState {
    return createInitState();
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: OmniStreamProcessingState,
  ): StreamChunkResult {
    return omniProcessStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: OmniStreamProcessingState): ParsedModelResponse {
    this.logger.info('finalizeStreamProcessing state \n', state);

    return {
      content: state.accumulatedAnswerBuffer || '',
      rawContent: state.contentBuffer,
      reasoningContent: state.reasoningBuffer ?? '',
      toolCalls: state.toolCalls,
      finishReason: (state.toolCalls || []).length > 0 ? 'tool_calls' : 'stop',
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
