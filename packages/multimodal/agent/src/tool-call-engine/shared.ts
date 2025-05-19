/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ParsedModelResponse } from '../types';
import { ChatCompletion } from '../types/third-party';

/**
 * Common basic output parser between different tool call engines.
 *
 * @param response parsed model response.
 * @returns
 */
export function parseResponse(response: ChatCompletion): ParsedModelResponse {
  const primaryChoice = response.choices[0];

  // @ts-expect-error FIXME: Solve the type problem here
  // Note thet OpenAI does not support "reasoning_content" in the chat completion response.
  // but the community (e.g. DeepSeek / Qwen / Doubao etc.) follow this specification.
  //
  // It is worth noting that we still haven't handled the case where we get <think>...</think> directly.
  // We should support `--reasoning-parser` like SGLang / VLLM in the future.
  const { tool_calls, reasoning_content } = primaryChoice.message;
  const parsedResponse: ParsedModelResponse = {
    content: primaryChoice.message.content || '',
  };

  // Check if "reasoning_content" exists in the primary choice
  if (reasoning_content) {
    parsedResponse.reasoningContent = reasoning_content;
  }

  // Check if "tool_calls" exists in the primary choice
  if (tool_calls && tool_calls.length > 0) {
    parsedResponse.toolCalls = tool_calls;
  }

  return parsedResponse;
}
