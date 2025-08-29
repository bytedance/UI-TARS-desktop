/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OmniStreamProcessingState } from './index';

/**
 * According to the historical state and the content of the current chunk, parse the new think content, and accumulate the state.reasoningBuffer at the same time
 * @param content The content of the current chunk
 * @param state Saved historical status
 * @returns
 */
export function extractThink(content: string, state: OmniStreamProcessingState): string {
  if (!state.thinkBuffer) {
    state.thinkBuffer = '';
  }

  if (state.thinkParseCompleted) {
    return '';
  }

  state.thinkBuffer += content;
  let result = '';

  // If the chunk has content and the think tag has not been processed yet, enter a while loop
  while (state.thinkBuffer.length > 0) {
    if (!state.insideThink) {
      // Look for opening think tag
      const openMatch = state.thinkBuffer.indexOf('<think>');
      if (openMatch !== -1) {
        // Found complete opening tag
        state.thinkBuffer = state.thinkBuffer.substring(openMatch + '<think>'.length);
        state.insideThink = true;
        continue;
      } else {
        // Check if buffer ends with partial opening tag
        const patterns = ['<', '<t', '<th', '<thi', '<thin', '<think'];
        let foundPartial = false;

        for (const pattern of patterns) {
          if (state.thinkBuffer.endsWith(pattern)) {
            // Keep the partial tag for next chunk
            state.thinkBuffer = pattern;
            foundPartial = true;
            break;
          }
        }

        if (!foundPartial) {
          // No partial tag found, clear buffer
          state.thinkBuffer = '';
        }
        break;
      }
    } else {
      // Inside think tag, look for closing tag
      const closeMatch = state.thinkBuffer.indexOf('</think>');
      if (closeMatch > -1) {
        // Found complete closing tag
        const thinkContent = state.thinkBuffer.substring(0, closeMatch);
        result += thinkContent;
        state.reasoningBuffer += thinkContent;
        state.thinkBuffer = state.thinkBuffer.substring(closeMatch + '</think>'.length);
        state.insideThink = false;
        state.thinkParseCompleted = true;
        continue;
      } else {
        // Check if buffer ends with partial closing tag
        const patterns = ['<', '</', '</t', '</th', '</thi', '</thin', '</think'];
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

/**
 * According to the historical status and the content of the current chunk, parse the answer content, and accumulate the state.contentBuffer at the same time
 * @param content The content of the current chunk
 * @param state  Saved historical status
 * @returns
 */
export function extractAnswer(content: string, state: OmniStreamProcessingState): string {
  if (!state.answerBuffer) {
    state.answerBuffer = '';
  }

  state.answerBuffer += content;
  let result = '';

  while (state.answerBuffer.length > 0) {
    if (!state.insideAnswer) {
      // Look for opening answer tag
      const openMatch = state.answerBuffer.indexOf('<answer>');
      if (openMatch !== -1) {
        // Found complete opening tag
        state.answerBuffer = state.answerBuffer.substring(openMatch + '<answer>'.length);
        state.insideAnswer = true;
        continue;
      } else {
        // Check if buffer ends with partial opening tag
        const patterns = ['<', '<a', '<an', '<ans', '<answ', '<answe', '<answer'];
        let foundPartial = false;

        for (const pattern of patterns) {
          if (state.answerBuffer.endsWith(pattern)) {
            // Keep the partial tag for next chunk
            state.answerBuffer = pattern;
            foundPartial = true;
            break;
          }
        }

        if (!foundPartial) {
          // No partial tag found, clear buffer
          state.answerBuffer = '';
        }
        break;
      }
    } else {
      // Inside answer tag, look for closing tag
      const closeMatch = state.answerBuffer.indexOf('</answer>');
      if (closeMatch !== -1) {
        // Found complete closing tag
        const answerContent = state.answerBuffer.substring(0, closeMatch);
        result += answerContent;
        state.accumulatedAnswerBuffer += answerContent;
        state.answerBuffer = state.answerBuffer.substring(closeMatch + '</answer>'.length);
        state.insideAnswer = false;
        continue;
      } else {
        // Check if buffer ends with partial closing tag
        const patterns = ['<', '</', '</a', '</an', '</ans', '</answ', '</answe', '</answer'];
        let foundPartial = false;

        for (const pattern of patterns) {
          if (state.answerBuffer.endsWith(pattern)) {
            // Extract content before partial tag
            const beforePartial = state.answerBuffer.substring(
              0,
              state.answerBuffer.length - pattern.length,
            );
            if (beforePartial) {
              result += beforePartial;
              state.accumulatedAnswerBuffer += beforePartial;
            }
            state.answerBuffer = pattern;
            foundPartial = true;
            break;
          }
        }

        if (!foundPartial) {
          // All content is answer content
          result += state.answerBuffer;
          state.accumulatedAnswerBuffer += state.answerBuffer;
          state.answerBuffer = '';
        }
        break;
      }
    }
  }

  return result;
}
