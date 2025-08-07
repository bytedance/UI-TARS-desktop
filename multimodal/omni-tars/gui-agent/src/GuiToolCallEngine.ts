/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolCallEngine, Tool } from '@tarko/agent';
import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';
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
 * GUI interaction optimized tool call engine
 */
export class GuiToolCallEngine extends ToolCallEngine {
  preparePrompt(instructions: string, tools: Tool[]): string {
    // Add GUI-specific instructions
    const guiInstructions = `
You are a GUI automation assistant. When interacting with user interfaces:
1. Describe what you see before taking actions
2. Take screenshots when needed to understand the current state
3. Be precise with coordinates and element selection
4. Wait for UI elements to load before interacting
5. Provide clear feedback about successful/failed interactions

Available tools for GUI interaction:
${tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n')}

${instructions}`;

    return guiInstructions;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      tools: context.tools?.map((tool) => ({
        type: 'function' as const,
        function: tool.function,
      })),
      temperature: context.temperature || 0.2, // Lower temperature for precise GUI interactions
      stream: true,
    };
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;

    if (delta?.content) {
      state.contentBuffer += delta.content;
    }

    if (delta?.tool_calls) {
      // Handle native tool calls for GUI operations
      for (const toolCallDelta of delta.tool_calls) {
        const existingCall = state.toolCalls.find((tc) => tc.id === toolCallDelta.id);
        if (existingCall) {
          // Update existing tool call
          if (toolCallDelta.function?.arguments) {
            existingCall.function.arguments += toolCallDelta.function.arguments;
          }
        } else {
          // Add new tool call
          state.toolCalls.push({
            id: toolCallDelta.id || `call_${Date.now()}`,
            type: 'function',
            function: {
              name: toolCallDelta.function?.name || '',
              arguments: toolCallDelta.function?.arguments || '',
            },
          });
        }
      }
    }

    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    return {
      content: delta?.content || '',
      reasoningContent: '',
      hasToolCallUpdate: !!delta?.tool_calls,
      toolCalls: state.toolCalls,
    };
  }

  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return {
      content: state.contentBuffer,
      rawContent: state.contentBuffer,
      reasoningContent: '',
      toolCalls: state.toolCalls,
      finishReason: state.toolCalls.length > 0 ? 'tool_calls' : 'stop',
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
      content: currentLoopAssistantEvent.content,
      tool_calls: currentLoopAssistantEvent.toolCalls,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return toolCallResults.map((result) => {
      // Extract text and image content for GUI results
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      return {
        role: 'tool' as const,
        tool_call_id: result.toolCallId,
        content: textContent,
      };
    });
  }
}
