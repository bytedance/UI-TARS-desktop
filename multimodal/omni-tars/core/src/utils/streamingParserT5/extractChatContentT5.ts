/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { think_token } from '../../environments/prompt_t5';
import { T5StreamProcessingState } from './index';

/**
 * Extract chat content from T5 format
 * This handles content that is outside of think tags and tool calls
 * Chat content is similar to answer content but serves as general conversation content
 * It has the same status as answer and they won't appear simultaneously
 *
 * @param content The content of the current chunk
 * @param state Saved historical status
 * @returns Extracted chat content for this chunk
 */
export function extractChatContentT5(content: string, state: T5StreamProcessingState): string {
  // If we're currently inside think or tool call tags, don't process chat content
  if (state.insideThink || state.insideToolCall) {
    return '';
  }

  let result = '';

  // Check if buffer contains any think or tool call tags and extract content before and after them
  const T5_THINK_TAG = think_token;
  const T5_THINK_OEPN_TAG = `<${T5_THINK_TAG}>`;
  const T5_THINK_CLOSE_TAG = `</${T5_THINK_TAG}>`;
  const TOOL_CALL_TAG = '<seed:tool_call>';

  // Look for think close tag to extract content after it
  const thinkCloseIndex = state.contentBuffer.indexOf(T5_THINK_CLOSE_TAG);
  if (thinkCloseIndex !== -1) {
    // Extract content after the closing think tag
    const afterThinkClose = state.contentBuffer.substring(
      thinkCloseIndex + T5_THINK_CLOSE_TAG.length,
    );

    // Check if there's any content after the think tag
    if (afterThinkClose) {
      // Look for any tool call tags in the remaining content
      const toolCallIndexInRemaining = afterThinkClose.indexOf(TOOL_CALL_TAG);

      if (toolCallIndexInRemaining !== -1) {
        // Extract content before tool call tag
        const contentBeforeToolCall = afterThinkClose.substring(0, toolCallIndexInRemaining);
        // Only include content if it's not just whitespace
        if (contentBeforeToolCall.trim()) {
          result = contentBeforeToolCall;
        }
      } else {
        // No tool call tag, check for partial tool call tags
        const partialToolCallTags = [
          '<seed:tool_call',
          '<seed:tool_cal',
          '<seed:tool_ca',
          '<seed:tool_c',
          '<seed:tool_',
          '<seed:tool',
          '<seed:too',
          '<seed:to',
          '<seed:t',
          '<seed:',
          '<seed',
          '<see',
          '<se',
          '<s',
          '<',
        ];

        let hasPartialToolCallTag = false;
        let partialTagIndex = -1;

        for (const partialTag of partialToolCallTags) {
          const index = afterThinkClose.lastIndexOf(partialTag);
          if (index !== -1 && index + partialTag.length === afterThinkClose.length) {
            hasPartialToolCallTag = true;
            partialTagIndex = index;
            break;
          }
        }

        if (hasPartialToolCallTag && partialTagIndex >= 0) {
          // Extract content before the partial tag
          result = afterThinkClose.substring(0, partialTagIndex);
          // Update buffer to keep the partial tag and content before think close
          state.contentBuffer =
            state.contentBuffer.substring(0, thinkCloseIndex + T5_THINK_CLOSE_TAG.length) +
            afterThinkClose.substring(partialTagIndex);
        } else {
          // All content after think close is chat content
          result = afterThinkClose;
          // Update buffer to only keep content up to and including think close
          state.contentBuffer = state.contentBuffer.substring(
            0,
            thinkCloseIndex + T5_THINK_CLOSE_TAG.length,
          );
        }
      }

      if (result) {
        if (state.accumulatedChatContentBuffer === undefined) {
          state.accumulatedChatContentBuffer = '';
        }
        state.accumulatedChatContentBuffer += result;

        // If we extracted content, update the buffer appropriately
        if (toolCallIndexInRemaining !== -1) {
          // Keep content up to and including the tool call tag for tool extractor
          state.contentBuffer = state.contentBuffer.substring(
            0,
            thinkCloseIndex + T5_THINK_CLOSE_TAG.length + toolCallIndexInRemaining,
          );
        }
      }
    }

    return result;
  }

  const thinkOpenIndex = state.contentBuffer.indexOf(T5_THINK_OEPN_TAG);
  const toolCallIndex = state.contentBuffer.indexOf(TOOL_CALL_TAG);

  // Find the earliest tag index (excluding think close since we handled it above)
  const tagIndices = [thinkOpenIndex, toolCallIndex].filter((i) => i !== -1);

  if (tagIndices.length > 0) {
    const earliestTagIndex = Math.min(...tagIndices);

    if (earliestTagIndex > 0) {
      // Extract content before the tag
      result = state.contentBuffer.substring(0, earliestTagIndex);
      if (state.accumulatedChatContentBuffer === undefined) {
        state.accumulatedChatContentBuffer = '';
      }
      state.accumulatedChatContentBuffer += result;
    }

    // Clear the buffer since it contains tags that should be handled by other extractors
    state.contentBuffer = '';
    return result;
  }

  // Check for partial tags at the end of the buffer that might be completed in future chunks
  // Order by length descending to match the longest possible partial tag first
  // Generate partial think tags dynamically based on think_token
  const generatePartialThinkTags = (token: string): string[] => {
    const tags = [];
    const openTag = `<${token}`;
    const closeTag = `</${token}`;

    // Add partial close tags (from longest to shortest)
    for (let i = closeTag.length - 1; i >= 1; i--) {
      tags.push(closeTag.substring(0, i));
    }

    // Add partial open tags (from longest to shortest, including the complete openTag without >)
    for (let i = openTag.length; i >= 1; i--) {
      tags.push(openTag.substring(0, i));
    }

    return tags;
  };

  const partialThinkTags = generatePartialThinkTags(T5_THINK_TAG);
  const partialToolCallTags = [
    '<seed:tool_call',
    '<seed:tool_cal',
    '<seed:tool_ca',
    '<seed:tool_c',
    '<seed:tool_',
    '<seed:tool',
    '<seed:too',
    '<seed:to',
    '<seed:t',
    '<seed:',
    '<seed',
    '<see',
    '<se',
    '<s',
    '<',
  ];

  // Combine and sort by length descending
  const partialTags = [...partialThinkTags, ...partialToolCallTags].sort(
    (a, b) => b.length - a.length,
  );

  let hasPartialTag = false;
  let partialTagIndex = -1;

  for (const partialTag of partialTags) {
    const index = state.contentBuffer.lastIndexOf(partialTag);
    if (index !== -1 && index > partialTagIndex) {
      // Check if this partial tag is at the end of the buffer (no characters after it)
      if (index + partialTag.length === state.contentBuffer.length) {
        hasPartialTag = true;
        partialTagIndex = index;
        break;
      }
    }
  }

  if (hasPartialTag && partialTagIndex >= 0) {
    // Extract content before the partial tag
    const beforePartial = state.contentBuffer.substring(0, partialTagIndex);
    if (beforePartial) {
      result = beforePartial;
      if (state.accumulatedChatContentBuffer === undefined) {
        state.accumulatedChatContentBuffer = '';
      }
      state.accumulatedChatContentBuffer += result;
    }
    // Keep the partial tag in buffer for next chunk
    state.contentBuffer = state.contentBuffer.substring(partialTagIndex);
    return result;
  }

  // No tags or partial tags found, all content is chat content
  result = state.contentBuffer;
  if (state.accumulatedChatContentBuffer === undefined) {
    state.accumulatedChatContentBuffer = '';
  }
  state.accumulatedChatContentBuffer += result;
  state.contentBuffer = '';

  return result;
}
