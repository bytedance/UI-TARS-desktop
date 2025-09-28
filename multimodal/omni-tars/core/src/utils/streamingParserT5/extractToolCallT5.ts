/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { StreamChunkResult, StreamingToolCallUpdate } from '@tarko/agent-interface';
import { T5StreamProcessingState } from './index';

/**
 * Extract tool call content from T5 format with seed:tool_call tags
 * Based on extractCodeEnv from streamingParser but adapted for T5's seed:tool_call format
 * Supports multiple functions within a single seed:tool_call block
 *
 * @param content The content of the current chunk
 * @param state Saved historical status
 * @returns Object with hasToolCallUpdate and streamingToolCallUpdates
 */
export function extractToolCallT5(
  content: string,
  state: T5StreamProcessingState,
): Pick<StreamChunkResult, 'hasToolCallUpdate' | 'streamingToolCallUpdates'> {
  // Use a separate buffer for tool call parsing
  if (!state.toolCallBuffer) {
    state.toolCallBuffer = '';
  }

  state.toolCallBuffer += content;
  let hasToolCallUpdate = false;
  const streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

  while (state.toolCallBuffer.length > 0) {
    if (!state.insideToolCall) {
      // Look for opening seed:tool_call tag
      const openMatch = state.toolCallBuffer.match(/<seed:tool_call>/);
      if (openMatch) {
        state.toolCallBuffer = state.toolCallBuffer.substring(
          openMatch.index! + openMatch[0].length,
        );
        state.insideToolCall = true;
        state.functionCount = 0; // Reset function count for new tool_call block
        continue;
      } else {
        // Check if we have a partial opening tag at the end
        if (hasPartialTagAtEnd(state.toolCallBuffer, ['<seed:tool_call>'])) {
          // Keep the partial tag for next chunk
          const lastBracketIndex = state.toolCallBuffer.lastIndexOf('<');
          state.toolCallBuffer = state.toolCallBuffer.substring(lastBracketIndex);
        } else {
          // No seed:tool_call tag found, clear the buffer
          state.toolCallBuffer = '';
        }
        break;
      }
    } else {
      // Inside seed:tool_call, look for function or closing tag
      const closeMatch = state.toolCallBuffer.match(/<\/seed:tool_call>/);

      if (!state.insideFunction) {
        // Look for function opening tag - be more flexible with matching
        const functionMatch = state.toolCallBuffer.match(/<function=([^>]*)>/);
        if (functionMatch && functionMatch[1]) {
          // Found function opening tag
          const toolName = functionMatch[1];
          state.currentToolName = toolName;
          state.currentParameters = {};
          state.insideFunction = true;
          state.functionCount = (state.functionCount || 0) + 1;
          state.toolCallBuffer = state.toolCallBuffer.substring(
            functionMatch.index! + functionMatch[0].length,
          );

          // Generate a tool call ID for each function
          state.currentToolCallId = generateToolCallId();

          // Create tool call
          state.toolCalls.push({
            id: state.currentToolCallId,
            type: 'function',
            function: {
              name: toolName,
              arguments: '',
            },
          });

          hasToolCallUpdate = true;
          streamingToolCallUpdates.push({
            toolCallId: state.currentToolCallId,
            toolName: toolName,
            argumentsDelta: '',
            isComplete: false,
          });

          continue;
        } else if (closeMatch) {
          // Found closing seed:tool_call tag
          state.toolCallBuffer = state.toolCallBuffer.substring(
            closeMatch.index! + closeMatch[0].length,
          );
          state.insideToolCall = false;
          continue;
        } else {
          // Check for partial function or closing tag
          if (hasPartialTagAtEnd(state.toolCallBuffer, ['<function=', '</seed:tool_call>'])) {
            // Keep the partial tag for next chunk
            const lastBracketIndex = state.toolCallBuffer.lastIndexOf('<');
            state.toolCallBuffer = state.toolCallBuffer.substring(lastBracketIndex);
          } else {
            // No relevant tags found, clear buffer
            state.toolCallBuffer = '';
          }
          break;
        }
      } else {
        // Inside function, look for parameters or function closing tag
        if (!state.insideParameter) {
          // Look for parameter opening tag, but make sure it comes before any function closing tag
          const parameterMatch = state.toolCallBuffer.match(/<parameter=([^>]+)>/);
          const functionCloseMatch = state.toolCallBuffer.match(/<\/function>/);

          if (
            parameterMatch &&
            (!functionCloseMatch || parameterMatch.index! < functionCloseMatch.index!)
          ) {
            // Found parameter opening tag and it comes before any function closing
            const paramName = parameterMatch[1];
            state.currentParameterName = paramName;
            state.insideParameter = true;
            state.parameterBuffer = '';
            state.toolCallBuffer = state.toolCallBuffer.substring(
              parameterMatch.index! + parameterMatch[0].length,
            );

            // Start building JSON for this parameter
            const isFirstParam =
              !state.currentParameters || Object.keys(state.currentParameters).length === 0;
            const argsDelta = isFirstParam ? `{"${paramName}": "` : `, "${paramName}": "`;

            // Update tool call arguments
            const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
            if (toolCall) {
              toolCall.function.arguments += argsDelta;
            }

            hasToolCallUpdate = true;
            streamingToolCallUpdates.push({
              toolCallId: state.currentToolCallId || '',
              toolName: state.currentToolName || '',
              argumentsDelta: argsDelta,
              isComplete: false,
            });

            continue;
          } else if (functionCloseMatch) {
            // Found function closing tag
            state.toolCallBuffer = state.toolCallBuffer.substring(
              functionCloseMatch.index! + functionCloseMatch[0].length,
            );

            // Complete the JSON arguments
            const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
            if (
              toolCall &&
              !toolCall.function.arguments.endsWith('}') &&
              toolCall.function.arguments.length > 0
            ) {
              toolCall.function.arguments += '}';

              hasToolCallUpdate = true;
              streamingToolCallUpdates.push({
                toolCallId: state.currentToolCallId || '',
                toolName: state.currentToolName || '',
                argumentsDelta: '}',
                isComplete: true,
              });
            }

            // Clear function state after creating the streaming update
            state.insideFunction = false;
            state.currentToolName = '';
            state.currentParameterName = '';
            state.currentParameters = {};
            // Don't reset tool call id here - each function should have its own ID generated when function starts
            state.currentToolCallId = '';

            continue;
          } else if (closeMatch) {
            // Found closing seed:tool_call tag
            state.toolCallBuffer = state.toolCallBuffer.substring(
              closeMatch.index! + closeMatch[0].length,
            );
            state.insideToolCall = false;
            state.insideFunction = false;
            continue;
          } else {
            // Check for partial tags
            if (
              hasPartialTagAtEnd(state.toolCallBuffer, [
                '<parameter=',
                '</function>',
                '</seed:tool_call>',
              ])
            ) {
              // Keep the partial tag for next chunk
              const lastBracketIndex = state.toolCallBuffer.lastIndexOf('<');
              state.toolCallBuffer = state.toolCallBuffer.substring(lastBracketIndex);
            } else {
              // No partial tag found, clear buffer
              state.toolCallBuffer = '';
            }
            break;
          }
        } else {
          // Inside parameter, look for parameter closing tag OR function closing tag
          const parameterCloseMatch = state.toolCallBuffer.match(/<\/parameter>/);
          const functionCloseMatchInside = state.toolCallBuffer.match(/<\/function>/);

          // Check if function closing tag comes before parameter closing tag
          if (
            functionCloseMatchInside &&
            parameterCloseMatch &&
            functionCloseMatchInside.index! < parameterCloseMatch.index!
          ) {
            // Function closes before parameter closes - this shouldn't happen in well-formed XML, but handle it
            // Exit parameter mode and handle function close
            state.insideParameter = false;
            continue;
          }

          if (parameterCloseMatch) {
            // Found parameter closing tag
            const paramValue = state.toolCallBuffer.substring(0, parameterCloseMatch.index);
            if (state.currentParameterName) {
              state.currentParameters![state.currentParameterName] =
                (state.currentParameters![state.currentParameterName] || '') + paramValue;
            }

            state.toolCallBuffer = state.toolCallBuffer.substring(
              parameterCloseMatch.index! + parameterCloseMatch[0].length,
            );
            state.insideParameter = false;

            // Update tool call arguments with proper JSON escaping
            const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
            if (toolCall) {
              const escapedValue = paramValue
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/\t/g, '\\t');
              toolCall.function.arguments += escapedValue + '"';
            }

            hasToolCallUpdate = true;
            streamingToolCallUpdates.push({
              toolCallId: state.currentToolCallId || '',
              toolName: state.currentToolName || '',
              argumentsDelta:
                paramValue
                  .replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r')
                  .replace(/\t/g, '\\t') + '"',
              isComplete: false,
            });

            continue;
          } else {
            // Inside parameter: only care about </parameter> tag
            if (hasPartialTagAtEnd(state.toolCallBuffer, ['</parameter>'])) {
              // Extract parameter content before partial tag
              const lastBracketIndex = state.toolCallBuffer.lastIndexOf('<');
              const paramValue = state.toolCallBuffer.substring(0, lastBracketIndex);

              if (paramValue && state.currentParameterName) {
                // Accumulate parameter value
                state.currentParameters![state.currentParameterName] =
                  (state.currentParameters![state.currentParameterName] || '') + paramValue;

                // Update tool call arguments with proper JSON escaping
                const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
                if (toolCall) {
                  const escapedValue = paramValue
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                  toolCall.function.arguments += escapedValue;
                }

                // Generate streaming update for parameter content
                hasToolCallUpdate = true;
                streamingToolCallUpdates.push({
                  toolCallId: state.currentToolCallId || '',
                  toolName: state.currentToolName || '',
                  argumentsDelta: paramValue
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t'),
                  isComplete: false,
                });
              }

              // Keep the partial tag for next chunk
              state.toolCallBuffer = state.toolCallBuffer.substring(lastBracketIndex);
            } else {
              // All content is parameter value
              if (state.currentParameterName && state.toolCallBuffer) {
                // Accumulate parameter value
                state.currentParameters![state.currentParameterName] =
                  (state.currentParameters![state.currentParameterName] || '') +
                  state.toolCallBuffer;

                // Update tool call arguments
                const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
                if (toolCall) {
                  const escapedValue = state.toolCallBuffer
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                  toolCall.function.arguments += escapedValue;
                }

                // Generate streaming update for parameter content
                hasToolCallUpdate = true;
                streamingToolCallUpdates.push({
                  toolCallId: state.currentToolCallId || '',
                  toolName: state.currentToolName || '',
                  argumentsDelta: state.toolCallBuffer
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t'),
                  isComplete: false,
                });
              }
              state.toolCallBuffer = '';
            }
            break;
          }
        }
      }
    }
  }

  return {
    hasToolCallUpdate,
    streamingToolCallUpdates,
  };
}

/**
 * Check if buffer ends with a partial tag that should be preserved for next chunk
 * Enhanced for real streaming scenarios where tags are split very granularly
 */
function hasPartialTagAtEnd(buffer: string, expectedTags: string[]): boolean {
  const lastBracketIndex = buffer.lastIndexOf('<');
  if (lastBracketIndex === -1) return false;

  const afterBracket = buffer.substring(lastBracketIndex);

  // If contains '>', it's a complete tag, not partial
  if (afterBracket.includes('>')) return false;

  // Check if it could be the beginning of any expected tag
  // Be more generous with matching for real streaming scenarios
  return expectedTags.some((tag) => {
    // Handle cases where tag might be split character by character
    return (
      tag.startsWith(afterBracket) || afterBracket.startsWith(tag.substring(0, afterBracket.length))
    );
  });
}

let testCallCounter = 0;

/**
 * Generate a tool call ID
 */
function generateToolCallId(): string {
  if (process.env.NODE_ENV === 'test') {
    return `random_id_${++testCallCounter}`;
  }
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
