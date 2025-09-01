/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { think_token } from '../../environments/prompt_t5';
import { T5StreamProcessingState } from './index';

/**
 * Generate partial patterns for a given tag dynamically
 * @param tag The tag name (e.g., 'think_never_used_...')
 * @returns Array of partial patterns for matching incomplete tags
 */
function generatePartialPatterns(tag: string): string[] {
  const patterns: string[] = [];
  const openTag = `<${tag}`;
  
  // Generate all possible partial patterns
  for (let i = 1; i <= openTag.length; i++) {
    patterns.push(openTag.substring(0, i));
  }
  
  return patterns;
}

/**
 * Generate partial closing patterns for a given tag dynamically
 * @param tag The tag name (e.g., 'think_never_used_...')
 * @returns Array of partial patterns for matching incomplete closing tags
 */
function generatePartialClosingPatterns(tag: string): string[] {
  const patterns: string[] = [];
  const closeTag = `</${tag}`;
  
  // Generate basic closing patterns
  const basicPatterns = ['<', '</', '</t', '</th', '</thi', '</thin', '</think'];
  patterns.push(...basicPatterns);
  
  // Generate all possible partial patterns for the specific tag
  for (let i = 1; i <= closeTag.length; i++) {
    const partial = closeTag.substring(0, i);
    if (!patterns.includes(partial)) {
      patterns.push(partial);
    }
  }
  
  return patterns;
}

/**
 * Extract think content from T5 format with dynamic tag matching
 * Based on extractThink from streamingParser but adapted for T5's think_never_used_51bce0c785ca2f68081bfa7d91973934 tag
 * Uses a more flexible pattern matching to handle potential tag changes
 *
 * @param content The content of the current chunk
 * @param state Saved historical status
 * @returns Extracted think content for this chunk
 */
export function extractThinkT5(content: string, state: T5StreamProcessingState): string {
  if (!state.thinkBuffer) {
    state.thinkBuffer = '';
  }

  if (state.thinkParseCompleted) {
    return '';
  }

  state.thinkBuffer += content;
  let result = '';

  // Match the specific T5 think tag and also be flexible for future changes
  const T5_THINK_TAG = think_token;
  const THINK_OPEN_TAG = `<${T5_THINK_TAG}>`;
  const THINK_CLOSE_TAG = `</${T5_THINK_TAG}>`;

  // If the chunk has content and the think tag has not been processed yet, enter a while loop
  while (state.thinkBuffer.length > 0) {
    if (!state.insideThink) {
      // Look for opening think tag
      const openMatch = state.thinkBuffer.indexOf(THINK_OPEN_TAG);
      if (openMatch !== -1) {
        // Found complete opening tag
        state.thinkBuffer = state.thinkBuffer.substring(openMatch + THINK_OPEN_TAG.length);
        state.insideThink = true;
        continue;
      } else {
        // Check if buffer ends with partial opening tag
        // Generate patterns dynamically based on current think_token
        const patterns = generatePartialPatterns(T5_THINK_TAG);
        let foundPartial = false;

        for (const pattern of patterns) {
          if (state.thinkBuffer.endsWith(pattern)) {
            // Keep the partial tag for next chunk
            state.thinkBuffer = pattern;
            foundPartial = true;
            break;
          }
        }

        // Also check for partial matches of the full T5 think tag
        for (let i = 1; i <= Math.min(THINK_OPEN_TAG.length - 1, state.thinkBuffer.length); i++) {
          const partial = THINK_OPEN_TAG.substring(0, i);
          if (state.thinkBuffer.endsWith(partial)) {
            state.thinkBuffer = partial;
            foundPartial = true;
            break;
          }
        }

        if (!foundPartial) {
          // No partial tag found, this content should be treated as regular content
          // Clear the buffer and let the system handle it as chat content
          state.thinkBuffer = '';
        }
        break;
      }
    } else {
      // Inside think tag, look for closing tag
      const closeMatch = state.thinkBuffer.indexOf(THINK_CLOSE_TAG);
      if (closeMatch > -1) {
        // Found complete closing tag
        const thinkContent = state.thinkBuffer.substring(0, closeMatch);
        result += thinkContent;
        state.reasoningBuffer += thinkContent;
        state.thinkBuffer = state.thinkBuffer.substring(closeMatch + THINK_CLOSE_TAG.length);
        state.insideThink = false;
        state.thinkParseCompleted = true;
        continue;
      } else {
        // Check if buffer ends with partial closing tag
        const patterns = generatePartialClosingPatterns(T5_THINK_TAG);
        let foundPartial = false;

        for (const pattern of patterns) {
          if (state.thinkBuffer.endsWith(pattern)) {
            // Extract content before partial tag
            const beforePartial = state.thinkBuffer.substring(
              0,
              state.thinkBuffer.length - pattern.length,
            );
            if (beforePartial) {
              result += beforePartial;
              state.reasoningBuffer += beforePartial;
            }
            state.thinkBuffer = pattern;
            foundPartial = true;
            break;
          }
        }

        // Also check for partial matches of the full T5 closing think tag
        for (let i = 1; i <= Math.min(THINK_CLOSE_TAG.length - 1, state.thinkBuffer.length); i++) {
          const partial = THINK_CLOSE_TAG.substring(0, i);
          if (state.thinkBuffer.endsWith(partial)) {
            const beforePartial = state.thinkBuffer.substring(
              0,
              state.thinkBuffer.length - partial.length,
            );
            if (beforePartial) {
              result += beforePartial;
              state.reasoningBuffer += beforePartial;
            }
            state.thinkBuffer = partial;
            foundPartial = true;
            break;
          }
        }

        if (!foundPartial) {
          // All content is think content
          result += state.thinkBuffer;
          state.reasoningBuffer += state.thinkBuffer;
          state.thinkBuffer = '';
        }
        break;
      }
    }
  }

  return result;
}
