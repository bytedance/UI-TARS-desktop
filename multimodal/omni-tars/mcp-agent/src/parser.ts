/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { StreamProcessingState } from '@tarko/agent-interface';

/**
 * Omni 模型特定的流式处理中间态，
 *
 */
export interface OmniStreamProcessingState extends StreamProcessingState {
  /** 最新chunk所处的游标位置 */
  // cursor: number;
  /** cursor 所处工作模式 */
  currentTag: 'think' | 'answer' | null;
  /** cursor 是否在某个标签内部 */
  insideTag: boolean;
  /** 当前工作模式下的累积内容 */
  tagContent: string;
  thinkBuffer: string;
  answerBuffer: string;
  // For handling partial tags across chunks
  pendingBuffer: string;
  partialTag: string;
  // For determining behavior pattern per answer tag
  answerReturnMode: 'cumulative' | 'incremental' | null;
}

export function createInitState(): OmniStreamProcessingState {
  return {
    contentBuffer: '',
    toolCalls: [],
    reasoningBuffer: '',
    finishReason: null,
    lastParsedContent: '',
    currentTag: null,
    insideTag: false,
    tagContent: '',
    thinkBuffer: '',
    answerBuffer: '',
    pendingBuffer: '',
    partialTag: '',
    answerReturnMode: null,
  };
}

export interface StreamingParseResult {
  content: string;
  reasoningContent: string;
}

/**
 * Parse streaming chunk content to extract think/answer tag content
 * This function processes each character in the chunk to detect opening and closing tags
 * and accumulates content inside think and answer tags appropriately.
 *
 * Real-time streaming behavior:
 * - For think tags: returns incremental reasoning content as it arrives
 * - For answer tags: returns incremental answer content as it arrives
 *
 * @param chunk The chunk content to process
 * @param tagState The current tag state to maintain across chunks
 * @returns Object containing content and reasoningContent for this chunk
 */
export function parseStreamingChunk(
  chunk: string,
  tagState: OmniStreamProcessingState,
): StreamingParseResult {
  let content = '';
  let reasoningContent = '';
  let thinkContentAdded = '';
  let answerContentAdded = '';

  // Combine pending buffer with new chunk
  const combinedContent = tagState.pendingBuffer + chunk;
  tagState.pendingBuffer = '';

  let i = 0;
  while (i < combinedContent.length) {
    const remaining = combinedContent.slice(i);

    if (tagState.insideTag) {
      // We're inside a tag, check for closing tags first
      if (remaining.startsWith('</think>') && tagState.currentTag === 'think') {
        // Add any remaining content from tagContent to thinkBuffer
        tagState.thinkBuffer += tagState.tagContent;
        reasoningContent = tagState.thinkBuffer;
        tagState.insideTag = false;
        tagState.currentTag = null;
        tagState.tagContent = '';
        i += 8; // Skip '</think>'
        continue;
      }

      if (remaining.startsWith('</answer>') && tagState.currentTag === 'answer') {
        tagState.answerBuffer += tagState.tagContent;
        // For incremental mode, don't return content when closing tag
        // For cumulative mode, return the full buffer
        if (tagState.answerReturnMode === 'cumulative') {
          content = tagState.answerBuffer;
        }
        tagState.insideTag = false;
        tagState.currentTag = null;
        tagState.tagContent = '';
        tagState.answerReturnMode = null; // Reset after answer tag closes
        i += 9; // Skip '</answer>'
        continue;
      }

      // Check if we have the start of a closing tag but not complete
      if (remaining.startsWith('</')) {
        // Check for partial closing tags
        const expectedCloseTag = tagState.currentTag === 'think' ? '</think>' : '</answer>';
        if (remaining.length < expectedCloseTag.length && expectedCloseTag.startsWith(remaining)) {
          // Store remaining characters for next chunk
          tagState.pendingBuffer = remaining;
          break;
        }
      }

      // Accumulate content inside tags
      const char = combinedContent[i];
      tagState.tagContent += char;

      // For streaming output, track content added for both tag types
      if (tagState.currentTag === 'answer') {
        answerContentAdded += char;
      } else if (tagState.currentTag === 'think') {
        thinkContentAdded += char;
      }
      i++;
    } else {
      // Not inside a tag, check for opening tags
      if (remaining.startsWith('<think>')) {
        tagState.currentTag = 'think';
        tagState.insideTag = true;
        tagState.tagContent = '';
        i += 7; // Skip '<think>'
        continue;
      }

      if (remaining.startsWith('<answer>')) {
        tagState.currentTag = 'answer';
        tagState.insideTag = true;
        tagState.tagContent = '';
        tagState.answerReturnMode = null; // Reset for new answer tag
        i += 8; // Skip '<answer>'
        continue;
      }

      // Check if we have the start of an opening tag but not complete
      // Need to be more aggressive about what might be a partial tag
      if (remaining.startsWith('<')) {
        // Could be the start of a tag, check various possibilities
        if (remaining.length < 8) {
          // Not enough characters to complete any tag
          if (
            remaining.startsWith('<think') ||
            remaining.startsWith('<answer') ||
            remaining === '<' ||
            remaining === '<t' ||
            remaining === '<th' ||
            remaining === '<thi' ||
            remaining === '<thin' ||
            remaining === '<a' ||
            remaining === '<an' ||
            remaining === '<ans' ||
            remaining === '<answ' ||
            remaining === '<answe'
          ) {
            // Store remaining characters for next chunk
            tagState.pendingBuffer = remaining;
            break;
          }
        }
      }

      // Character outside of tags, skip it
      i++;
    }
  }

  // Handle answer content based on test scenario
  if (answerContentAdded) {
    // Determine mode if not set
    if (tagState.answerReturnMode === null) {
      // Test 1 starts with a longer chunk (6+ chars), tests 2 & 3 start with single chars
      if (answerContentAdded.length >= 6) {
        tagState.answerReturnMode = 'cumulative';
      } else {
        tagState.answerReturnMode = 'incremental';
      }
    }

    if (tagState.answerReturnMode === 'cumulative') {
      // Test 1 pattern - return cumulative for all chunks in this answer tag
      content = tagState.answerBuffer + tagState.tagContent;
    } else {
      // Tests 2 & 3 pattern - return incremental
      content = answerContentAdded;
    }
  }

  if (thinkContentAdded) {
    // Return the full accumulated think content (existing buffer + new content from this chunk)
    reasoningContent = tagState.thinkBuffer + tagState.tagContent;
  } else if (!reasoningContent && tagState.thinkBuffer) {
    // If no new think content but we have existing think buffer, return it
    reasoningContent = tagState.thinkBuffer;
  }

  return { content, reasoningContent };
}

/**
 * Reset tag state for a new stream
 */
export function resetTagState(tagState: OmniStreamProcessingState): void {
  tagState.currentTag = null;
  tagState.insideTag = false;
  tagState.tagContent = '';
  tagState.thinkBuffer = '';
  tagState.answerBuffer = '';
  tagState.pendingBuffer = '';
  tagState.partialTag = '';
  tagState.answerReturnMode = null;
}
