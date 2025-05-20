/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';

/**
 * Reconstruct a ChatCompletion object from an array of chunks
 * This provides a compatible object for the onLLMResponse hook
 */
export function reconstructCompletion(chunks: ChatCompletionChunk[]): ChatCompletion {
  if (chunks.length === 0) {
    // Return minimal valid structure if no chunks
    return {
      id: '',
      choices: [],
      created: Date.now(),
      model: '',
      object: 'chat.completion',
    };
  }

  // Take basic info from the last chunk
  const lastChunk = chunks[chunks.length - 1];

  // Build the content by combining all chunks
  let content = '';
  let reasoningContent = '';
  const toolCalls: ChatCompletionMessageToolCall[] = [];

  // Track tool calls by index
  const toolCallsMap = new Map<number, Partial<ChatCompletionMessageToolCall>>();

  // Process all chunks to reconstruct the complete response
  for (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta;

    // Accumulate content
    if (delta?.content) {
      content += delta.content;
    }

    // Accumulate reasoning content
    // @ts-expect-error Not in OpenAI types
    if (delta?.reasoning_content) {
      // @ts-expect-error
      reasoningContent += delta.reasoning_content;
    }

    // Process tool calls
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const index = tc.index;

        // Initialize tool call if needed
        if (!toolCallsMap.has(index)) {
          toolCallsMap.set(index, {
            id: tc.id,
            type: tc.type,
            function: { name: '', arguments: '' },
          });
        }

        // Update existing tool call
        const currentTc = toolCallsMap.get(index)!;

        if (tc.function?.name) {
          currentTc.function!.name = tc.function.name;
        }

        if (tc.function?.arguments) {
          currentTc.function!.arguments =
            (currentTc.function!.arguments || '') + tc.function.arguments;
        }
      }
    }
  }

  // Convert map to array
  toolCallsMap.forEach((tc) => toolCalls.push(tc as ChatCompletionMessageToolCall));

  // Build the reconstructed completion
  return {
    id: lastChunk.id,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
          // @ts-expect-error Not in OpenAI types
          reasoning_content: reasoningContent || undefined,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finish_reason: lastChunk.choices[0]?.finish_reason || 'stop',
      },
    ],
    created: lastChunk.created,
    model: lastChunk.model,
    object: 'chat.completion',
  };
}
