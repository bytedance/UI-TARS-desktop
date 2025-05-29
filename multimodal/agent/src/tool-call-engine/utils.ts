/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '../utils/logger';
import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  MultimodalToolCallResult,
} from '@multimodal/agent-interface';

const logger = getLogger('ToolCallEngine');

/**
 * Builds chat completion messages from tool call results.
 *
 * This shared utility handles the conversion of tool call results into properly
 * formatted messages for different LLM engine types.
 *
 * For native engines (using OpenAI's tool protocol):
 * - Text content goes into a 'tool' role message
 * - Non-text content (like images) goes into a separate 'user' role message
 *
 * For non-native engines (Prompt Engineering & Structured Outputs):
 * - When only text is present: A single 'user' message with text content
 * - When multimodal content exists: A single 'user' message with an array of content parts,
 *   combining text and non-text elements (images, etc.)
 *
 * @param toolCallResults - Array of multimodal tool call results to process
 * @param isNativeEngine - Whether to format for native tool protocol (OpenAI)
 * @returns Array of properly formatted chat completion messages
 */
export function buildToolCallResultMessages(
  toolCallResults: MultimodalToolCallResult[],
  isNativeEngine = false,
): ChatCompletionMessageParam[] {
  if (toolCallResults.length === 0) {
    return [];
  }

  logger.debug(`Building ${toolCallResults.length} tool call result messages`);

  // Select appropriate processing strategy based on engine type upfront
  // rather than checking in each iteration
  return isNativeEngine
    ? buildNativeEngineMessages(toolCallResults)
    : buildNonNativeEngineMessages(toolCallResults);
}

/**
 * Processes tool call results for native engines (OpenAI tool protocol).
 * Separates text content (tool role) from non-text content (user role).
 */
function buildNativeEngineMessages(
  toolCallResults: MultimodalToolCallResult[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  for (const result of toolCallResults) {
    // Extract text content
    const textContent = result.content
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('');

    // Add standard tool result message (text content only)
    messages.push({
      role: 'tool',
      tool_call_id: result.toolCallId,
      content: textContent,
    });

    // If non-text content exists (images, etc.), add as a separate user message
    const nonTextParts = result.content.filter((part) => part.type !== 'text');
    if (nonTextParts.length > 0) {
      logger.debug(`Adding non-text content message for tool result: ${result.toolName}`);
      messages.push({
        role: 'user',
        content: nonTextParts,
      });
    }
  }

  return messages;
}

/**
 * Processes tool call results for non-native engines (Prompt Engineering & Structured Outputs).
 * Combines text and non-text content into single messages with appropriate formatting.
 */
function buildNonNativeEngineMessages(
  toolCallResults: MultimodalToolCallResult[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  for (const result of toolCallResults) {
    const hasNonTextContent = result.content.some((part) => part.type !== 'text');

    if (hasNonTextContent) {
      // Multimodal content - create a single message with all content parts
      const textParts = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      // Create combined content array
      const combinedContent: ChatCompletionContentPart[] = [
        {
          type: 'text',
          text: `Tool: ${result.toolName}\nResult:\n${textParts}`,
        },
        ...result.content.filter((part) => part.type !== 'text'),
      ];

      messages.push({
        role: 'user',
        content: combinedContent,
      });
    } else {
      // Text-only content - use simple string format
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      messages.push({
        role: 'user',
        content: `Tool: ${result.toolName}\nResult:\n${textContent}`,
      });
    }
  }

  return messages;
}
