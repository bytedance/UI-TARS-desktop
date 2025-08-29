/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { StreamChunkResult, StreamingToolCallUpdate } from '@tarko/agent-interface';
import { OmniStreamProcessingState } from '.';

/**
 * According to the historical status and the content of the current chunk, parse the code_env content, and accumulate the state.toolCalls at the same time
 * @param content The content of the current chunk
 * @param state  Saved historical status
 * @returns
 */
export function extractCodeEnv(
  content: string,
  state: OmniStreamProcessingState,
): Pick<StreamChunkResult, 'hasToolCallUpdate' | 'streamingToolCallUpdates'> {
  // Use a separate buffer for code_env parsing
  if (!state.codeEnvBuffer) {
    state.codeEnvBuffer = '';
  }

  state.codeEnvBuffer += content;
  let hasToolCallUpdate = false;
  const streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

  // No initial tracking needed for streaming mode

  while (state.codeEnvBuffer.length > 0 && !state.insideGUI && !state.insideMcp) {
    if (state.codeEnvBuffer.indexOf('computer_env') > -1) {
      state.insideGUI = true;
      break;
    }

    if (state.codeEnvBuffer.indexOf('mcp_env') > -1) {
      state.insideMcp = true;
      break;
    }

    if (!state.insideCodeEnv) {
      // Look for opening code_env tag
      const openMatch = state.codeEnvBuffer.match(/<code_env>/);
      if (openMatch) {
        state.codeEnvBuffer = state.codeEnvBuffer.substring(openMatch.index! + openMatch[0].length);
        state.insideCodeEnv = true;
        continue;
      } else {
        // Check if we have a partial opening tag at the end
        if (hasPartialTagAtEnd(state.codeEnvBuffer, ['<code_env>'])) {
          // Keep the partial tag for next chunk
          const lastBracketIndex = state.codeEnvBuffer.lastIndexOf('<');
          state.codeEnvBuffer = state.codeEnvBuffer.substring(lastBracketIndex);
        } else {
          // No code_env tag found, clear the buffer
          state.codeEnvBuffer = '';
        }
        break;
      }
    } else {
      // Inside code_env, look for function or closing tag
      const closeMatch = state.codeEnvBuffer.match(/<\/code_env>/);

      if (!state.insideFunction) {
        // Look for function opening tag - be more flexible with matching
        const functionMatch = state.codeEnvBuffer.match(/<function=([^>]*)>/);
        if (functionMatch && functionMatch[1]) {
          // Found function opening tag
          const toolName = functionMatch[1];
          state.currentToolName = toolName;
          state.currentParameters = {};
          state.insideFunction = true;
          state.codeEnvBuffer = state.codeEnvBuffer.substring(
            functionMatch.index! + functionMatch[0].length,
          );

          // Generate a tool call ID
          if (!state.currentToolCallId) {
            state.currentToolCallId = generateToolCallId();
          }

          // Create or update tool call
          const existingToolCallIndex = state.toolCalls.findIndex(
            (tc) => tc.id === state.currentToolCallId,
          );
          if (existingToolCallIndex === -1) {
            state.toolCalls.push({
              id: state.currentToolCallId,
              type: 'function',
              function: {
                name: toolName,
                arguments: '',
              },
            });
          }

          hasToolCallUpdate = true;
          streamingToolCallUpdates.push({
            toolCallId: state.currentToolCallId,
            toolName: toolName,
            argumentsDelta: '',
            isComplete: false,
          });

          continue;
        } else if (closeMatch) {
          // Found closing code_env tag
          state.codeEnvBuffer = state.codeEnvBuffer.substring(
            closeMatch.index! + closeMatch[0].length,
          );
          state.insideCodeEnv = false;
          continue;
        } else {
          // Check for partial function or closing tag
          if (hasPartialTagAtEnd(state.codeEnvBuffer, ['<function=', '</code_env>'])) {
            // Keep the partial tag for next chunk
            const lastBracketIndex = state.codeEnvBuffer.lastIndexOf('<');
            state.codeEnvBuffer = state.codeEnvBuffer.substring(lastBracketIndex);
          } else {
            // No relevant tags found, clear buffer
            state.codeEnvBuffer = '';
          }
          break;
        }
      } else {
        // Inside function, look for parameters or function closing tag
        const functionCloseMatch = state.codeEnvBuffer.match(/<\/function>/);

        if (!state.insideParameter) {
          // Look for parameter opening tag
          const parameterMatch = state.codeEnvBuffer.match(/<parameter=([^>]+)>/);
          if (parameterMatch) {
            // Found parameter opening tag
            const paramName = parameterMatch[1];
            state.currentParameterName = paramName;
            state.insideParameter = true;
            state.parameterBuffer = '';
            state.codeEnvBuffer = state.codeEnvBuffer.substring(
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
            state.codeEnvBuffer = state.codeEnvBuffer.substring(
              functionCloseMatch.index! + functionCloseMatch[0].length,
            );

            // Complete the JSON arguments
            const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
            if (toolCall && !toolCall.function.arguments.endsWith('}')) {
              toolCall.function.arguments += ' }';

              hasToolCallUpdate = true;
              streamingToolCallUpdates.push({
                toolCallId: state.currentToolCallId || '',
                toolName: state.currentToolName || '',
                argumentsDelta: ' }',
                isComplete: true,
              });
            }

            // Clear function state after creating the streaming update
            state.insideFunction = false;
            state.currentToolName = '';

            continue;
          } else if (closeMatch) {
            // Found closing code_env tag
            state.codeEnvBuffer = state.codeEnvBuffer.substring(
              closeMatch.index! + closeMatch[0].length,
            );
            state.insideCodeEnv = false;
            state.insideFunction = false;
            continue;
          } else {
            // Check for partial tags
            if (
              hasPartialTagAtEnd(state.codeEnvBuffer, ['<parameter=', '</function>', '</code_env>'])
            ) {
              // Keep the partial tag for next chunk
              const lastBracketIndex = state.codeEnvBuffer.lastIndexOf('<');
              state.codeEnvBuffer = state.codeEnvBuffer.substring(lastBracketIndex);
            } else {
              // No partial tag found, clear buffer
              state.codeEnvBuffer = '';
            }
            break;
          }
        } else {
          // Inside parameter, look for parameter closing tag
          const parameterCloseMatch = state.codeEnvBuffer.match(/<\/parameter>/);
          if (parameterCloseMatch) {
            // Found parameter closing tag
            const paramValue = state.codeEnvBuffer.substring(0, parameterCloseMatch.index);
            if (state.currentParameterName) {
              state.currentParameters![state.currentParameterName] =
                (state.currentParameters![state.currentParameterName] || '') + paramValue;
            }

            state.codeEnvBuffer = state.codeEnvBuffer.substring(
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
            if (hasPartialTagAtEnd(state.codeEnvBuffer, ['</parameter>'])) {
              // Extract parameter content before partial tag
              const lastBracketIndex = state.codeEnvBuffer.lastIndexOf('<');
              const paramValue = state.codeEnvBuffer.substring(0, lastBracketIndex);

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
              state.codeEnvBuffer = state.codeEnvBuffer.substring(lastBracketIndex);
            } else {
              // All content is parameter value
              if (state.currentParameterName && state.codeEnvBuffer) {
                // Accumulate parameter value
                state.currentParameters![state.currentParameterName] =
                  (state.currentParameters![state.currentParameterName] || '') +
                  state.codeEnvBuffer;

                // Update tool call arguments
                const toolCall = state.toolCalls.find((tc) => tc.id === state.currentToolCallId);
                if (toolCall) {
                  const escapedValue = state.codeEnvBuffer
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
                  argumentsDelta: state.codeEnvBuffer
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t'),
                  isComplete: false,
                });
              }
              state.codeEnvBuffer = '';
            }
            break;
          }
        }
      }
    }
  }

  // Streaming updates are created during processing above

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

/**
 * Generate a tool call ID
 */
function generateToolCallId(): string {
  if (process.env.TEST) {
    return 'random_id';
  }
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
