/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Tool,
  ToolCallEngine,
  ParsedModelResponse,
  PrepareRequestContext,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  ChatCompletionMessageToolCall,
  StreamProcessingState,
  StreamChunkResult,
  StreamingToolCallUpdate,
} from '@multimodal/agent-interface';

import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { isTest } from '../utils/env';
import { buildToolCallResultMessages } from './utils';

/**
 * Parser states for processing streaming content
 */
type ParserState = 'normal' | 'possible_tag_start' | 'collecting_tool_call' | 'possible_tag_end';

/**
 * Extended stream processing state for prompt engineering
 */
interface ExtendedStreamProcessingState extends StreamProcessingState {
  // Current tool call content being collected
  currentToolCallBuffer: string;
  // Whether we're currently inside a tool call tag
  hasActiveToolCall: boolean;
  // Buffer for normal content (outside tool calls)
  normalContentBuffer: string;
  // Current parser state
  parserState: ParserState;
  // Buffer for partial tag matching
  partialTagBuffer: string;
  // Whether we've extracted the tool name from current tool call
  toolNameExtracted: boolean;
  // Whether we're currently emitting parameter characters
  emittingParameters: boolean;
  // Current tool name being processed
  currentToolName: string;
  // Current tool call ID
  currentToolCallId: string;
}

/**
 * A Tool Call Engine based on prompt engineering with proper streaming support.
 *
 * This implementation uses a state machine to correctly parse <tool_call>...</tool_call>
 * tags across multiple streaming chunks, ensuring proper content separation and
 * tool call event emission that aligns with native engine behavior.
 */
export class PromptEngineeringToolCallEngine extends ToolCallEngine<ExtendedStreamProcessingState> {
  private logger = getLogger('PromptEngine');

  preparePrompt(instructions: string, tools: Tool[]): string {
    // If no tools, return original instructions
    if (!tools || tools.length === 0) {
      return instructions;
    }

    this.logger.info(`Preparing prompt with ${tools.length} tools`);

    // Create clearer tool format for instruction-based models
    const toolsDescription = tools
      .map((tool) => {
        const schema = zodToJsonSchema(tool.schema);
        const properties = schema.properties || {};
        const requiredProps = schema.required || [];

        const paramsDescription = Object.entries(properties)
          .map(([name, prop]: [string, any]) => {
            const isRequired = requiredProps.includes(name);
            return `- ${name}${isRequired ? ' (required)' : ''}: ${prop.description || 'No description'} (type: ${prop.type})`;
          })
          .join('\n');

        return `## ${tool.name}

Description: ${tool.description}

Parameters:
${paramsDescription || 'No parameters required'}`;
      })
      .join('\n\n');

    // Use clearer JSON format instructions and add conversation format guidance
    return `${instructions}

You have access to the following tools:

${toolsDescription}

To use a tool, your response MUST use the following format, you need to ensure that it is a valid JSON string:

<tool_call>
{
  "name": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
</tool_call>

If you want to provide a final answer without using tools, respond in a conversational manner WITHOUT using the tool_call format.

When you receive tool results, they will be provided in a user message. Use these results to continue your reasoning or provide a final answer.
`;
  }

  prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams {
    const { model, messages, temperature = 0.7 } = context;

    this.logger.debug(`Preparing request for model: ${model}`);

    // Claude doesn't use tool parameters, we've already included tools in the prompt
    return {
      model,
      messages,
      temperature,
      stream: false,
    };
  }

  /**
   * Initialize stream processing state for prompt engineering tool calls
   */
  initStreamProcessingState(): ExtendedStreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,

      // Extended state for prompt engineering
      currentToolCallBuffer: '',
      hasActiveToolCall: false,
      normalContentBuffer: '',
      parserState: 'normal' as ParserState,
      partialTagBuffer: '',
      toolNameExtracted: false,
      emittingParameters: false,
      currentToolName: '',
      currentToolCallId: '',
    };
  }

  /**
   * Process a streaming chunk using state machine for proper tool call parsing
   */
  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: ExtendedStreamProcessingState,
  ): StreamChunkResult {
    const extendedState = state;
    const delta = chunk.choices[0]?.delta;
    let content = '';
    let reasoningContent = '';
    let hasToolCallUpdate = false;
    const streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

    // Extract finish reason if present
    if (chunk.choices[0]?.finish_reason) {
      extendedState.finishReason = chunk.choices[0].finish_reason;
    }

    // Process reasoning content if present
    // @ts-expect-error Not in OpenAI types but present in compatible LLMs
    if (delta?.reasoning_content) {
      // @ts-expect-error
      reasoningContent = delta.reasoning_content;
      extendedState.reasoningBuffer += reasoningContent;
    }

    // Process regular content if present
    if (delta?.content) {
      const newContent = delta.content;
      extendedState.contentBuffer += newContent;

      // Process the content character by character using state machine
      const result = this.processContentWithStateMachine(newContent, extendedState);
      content = result.content;
      hasToolCallUpdate = result.hasToolCallUpdate;

      if (result.streamingToolCallUpdates) {
        streamingToolCallUpdates.push(...result.streamingToolCallUpdates);
      }
    }

    return {
      content,
      reasoningContent,
      hasToolCallUpdate,
      toolCalls: extendedState.toolCalls,
      streamingToolCallUpdates:
        streamingToolCallUpdates.length > 0 ? streamingToolCallUpdates : undefined,
    };
  }

  /**
   * Process content using state machine to handle streaming tool call parsing
   */
  private processContentWithStateMachine(
    newContent: string,
    state: ExtendedStreamProcessingState,
  ): {
    content: string;
    hasToolCallUpdate: boolean;
    streamingToolCallUpdates?: StreamingToolCallUpdate[];
  } {
    let outputContent = '';
    let hasToolCallUpdate = false;
    const streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

    // Process each character with the state machine
    for (let i = 0; i < newContent.length; i++) {
      const char = newContent[i];

      switch (state.parserState) {
        case 'normal':
          if (char === '<') {
            state.parserState = 'possible_tag_start';
            state.partialTagBuffer = '<';
          } else {
            state.normalContentBuffer += char;
            outputContent += char;
          }
          break;

        case 'possible_tag_start':
          state.partialTagBuffer += char;

          if (state.partialTagBuffer === '<tool_call>') {
            // Found opening tag - transition to collecting tool call
            state.parserState = 'collecting_tool_call';
            state.hasActiveToolCall = true;
            state.currentToolCallBuffer = '';
            state.partialTagBuffer = '';
            // Reset tool call tracking state
            state.toolNameExtracted = false;
            state.emittingParameters = false;
            state.currentToolName = '';
            state.currentToolCallId = '';
          } else if (!this.isPossibleTagStart(state.partialTagBuffer)) {
            // Not a tool call tag, emit buffered content as normal
            state.normalContentBuffer += state.partialTagBuffer;
            outputContent += state.partialTagBuffer;
            state.parserState = 'normal';
            state.partialTagBuffer = '';
          }
          // Continue collecting if still a possible tag start
          break;

        case 'collecting_tool_call':
          if (char === '<') {
            state.parserState = 'possible_tag_end';
            state.partialTagBuffer = '<';
          } else {
            state.currentToolCallBuffer += char;

            // Try to extract tool name if not yet extracted
            if (!state.toolNameExtracted) {
              const toolName = this.tryExtractToolName(state.currentToolCallBuffer);
              if (toolName) {
                state.toolNameExtracted = true;
                state.currentToolName = toolName;
                state.currentToolCallId = this.generateToolCallId();

                // Emit initial empty arguments to signal tool call start
                streamingToolCallUpdates.push({
                  toolCallId: state.currentToolCallId,
                  toolName: state.currentToolName,
                  argumentsDelta: '',
                  isComplete: false,
                });
                hasToolCallUpdate = true;
              }
            }

            // If tool name is extracted, check if we should start emitting parameters
            if (state.toolNameExtracted && !state.emittingParameters) {
              const parametersStart = this.findParametersStart(state.currentToolCallBuffer);
              if (parametersStart !== -1) {
                state.emittingParameters = true;

                // Emit all collected parameter characters so far
                const parametersPortion = state.currentToolCallBuffer.substring(parametersStart);
                for (const paramChar of parametersPortion) {
                  streamingToolCallUpdates.push({
                    toolCallId: state.currentToolCallId,
                    toolName: state.currentToolName,
                    argumentsDelta: paramChar,
                    isComplete: false,
                  });
                }
                hasToolCallUpdate = true;
              }
            } else if (state.emittingParameters) {
              // Already emitting parameters, emit this character
              streamingToolCallUpdates.push({
                toolCallId: state.currentToolCallId,
                toolName: state.currentToolName,
                argumentsDelta: char,
                isComplete: false,
              });
              hasToolCallUpdate = true;
            }
          }
          break;

        case 'possible_tag_end':
          state.partialTagBuffer += char;

          if (state.partialTagBuffer === '</tool_call>') {
            // Found closing tag - complete tool call
            const toolCallUpdate = this.completeToolCall(state);
            if (toolCallUpdate) {
              hasToolCallUpdate = true;
              streamingToolCallUpdates.push(toolCallUpdate);
            }
            state.parserState = 'normal';
            state.hasActiveToolCall = false;
            state.currentToolCallBuffer = '';
            state.partialTagBuffer = '';
            // Reset tool call tracking state
            state.toolNameExtracted = false;
            state.emittingParameters = false;
            state.currentToolName = '';
            state.currentToolCallId = '';
          } else if (!this.isPossibleTagEnd(state.partialTagBuffer)) {
            // Not a closing tag, add to tool call buffer
            state.currentToolCallBuffer += state.partialTagBuffer;
            state.parserState = 'collecting_tool_call';
            state.partialTagBuffer = '';

            // If we're already emitting parameters, emit the buffered characters
            if (state.emittingParameters) {
              for (const bufferedChar of state.partialTagBuffer) {
                streamingToolCallUpdates.push({
                  toolCallId: state.currentToolCallId,
                  toolName: state.currentToolName,
                  argumentsDelta: bufferedChar,
                  isComplete: false,
                });
              }
              hasToolCallUpdate = true;
            }
          }
          // Continue collecting if still a possible tag end
          break;
      }
    }

    return {
      content: outputContent,
      hasToolCallUpdate,
      streamingToolCallUpdates:
        streamingToolCallUpdates.length > 0 ? streamingToolCallUpdates : undefined,
    };
  }

  /**
   * Try to extract tool name from JSON content
   */
  private tryExtractToolName(content: string): string | null {
    try {
      // Look for name field in JSON
      const nameMatch = content.match(/"name"\s*:\s*"([^"]+)"/);
      if (nameMatch) {
        return nameMatch[1];
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }

  /**
   * Find the start index of parameters content (the opening brace)
   */
  private findParametersStart(content: string): number {
    const parametersMatch = content.match(/"parameters"\s*:\s*\{/);
    if (parametersMatch && parametersMatch.index !== undefined) {
      // Return the index of the opening brace
      return parametersMatch.index + parametersMatch[0].length - 1;
    }
    return -1;
  }

  /**
   * Generate a tool call ID
   */
  private generateToolCallId(): string {
    return isTest()
      ? `call_1747633091730_6m2magifs`
      : `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Check if the partial tag buffer could be the start of a tool call tag
   */
  private isPossibleTagStart(buffer: string): boolean {
    const target = '<tool_call>';
    return target.startsWith(buffer);
  }

  /**
   * Check if the partial tag buffer could be the end of a tool call tag
   */
  private isPossibleTagEnd(buffer: string): boolean {
    const target = '</tool_call>';
    return target.startsWith(buffer);
  }

  /**
   * Complete a tool call when closing tag is found
   */
  private completeToolCall(state: ExtendedStreamProcessingState): StreamingToolCallUpdate | null {
    try {
      const toolCallContent = state.currentToolCallBuffer.trim();
      const toolCallData = JSON.parse(toolCallContent);

      if (toolCallData && toolCallData.name) {
        const toolCallId = state.currentToolCallId || this.generateToolCallId();

        const toolCall: ChatCompletionMessageToolCall = {
          id: toolCallId,
          type: 'function',
          function: {
            name: toolCallData.name,
            arguments: JSON.stringify(toolCallData.parameters || {}),
          },
        };

        state.toolCalls.push(toolCall);

        this.logger.debug(`Completed tool call: ${toolCallData.name} with ID: ${toolCallId}`);

        return {
          toolCallId,
          toolName: toolCallData.name,
          argumentsDelta: '', // Empty delta for completion
          isComplete: true,
        };
      }
    } catch (error) {
      this.logger.error('Failed to parse tool call JSON:', error);
    }

    return null;
  }

  /**
   * Finalize the stream processing and extract the final response
   * Only extract tool calls if they haven't been extracted during streaming
   */
  finalizeStreamProcessing(state: ExtendedStreamProcessingState): ParsedModelResponse {
    const extendedState = state;
    let finalContent = extendedState.normalContentBuffer;
    let finalToolCalls = [...extendedState.toolCalls];

    // Only perform final extraction if no tool calls were found during streaming
    // This prevents duplicate parsing
    if (finalToolCalls.length === 0 && this.hasCompletedToolCall(extendedState.contentBuffer)) {
      const { cleanedContent, extractedToolCalls } = this.extractToolCalls(
        extendedState.contentBuffer,
      );
      finalContent = cleanedContent;
      finalToolCalls = extractedToolCalls;
    }

    const finishReason =
      finalToolCalls.length > 0 ? 'tool_calls' : extendedState.finishReason || 'stop';

    return {
      content: finalContent,
      reasoningContent: extendedState.reasoningBuffer || undefined,
      toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
      finishReason,
    };
  }

  /**
   * Check if content contains a complete tool call (fallback for finalization)
   */
  private hasCompletedToolCall(content: string): boolean {
    return content.includes('<tool_call>') && content.includes('</tool_call>');
  }

  /**
   * Extract tool calls from content (fallback for finalization)
   */
  private extractToolCalls(content: string): {
    cleanedContent: string;
    extractedToolCalls: ChatCompletionMessageToolCall[];
  } {
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Match <tool_call>...</tool_call> blocks
    const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
    let match;
    let cleanedContent = content;

    while ((match = toolCallRegex.exec(content)) !== null) {
      const toolCallContent = match[1].trim();

      try {
        const toolCallData = JSON.parse(toolCallContent);

        if (toolCallData && toolCallData.name) {
          const toolCallId = this.generateToolCallId();
          toolCalls.push({
            id: toolCallId,
            type: 'function',
            function: {
              name: toolCallData.name,
              arguments: JSON.stringify(toolCallData.parameters || {}),
            },
          });
          this.logger.debug(`Found tool call: ${toolCallData.name} with ID: ${toolCallId}`);
        }
      } catch (error) {
        this.logger.error('Failed to parse tool call JSON:', error);
      }
    }

    // Remove all tool call blocks from content
    cleanedContent = content.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

    return { cleanedContent, extractedToolCalls: toolCalls };
  }

  buildHistoricalAssistantMessage(
    currentLoopResponse: AgentSingleLoopReponse,
  ): ChatCompletionAssistantMessageParam {
    const { content } = currentLoopResponse;
    // Claude doesn't support tool_calls field, only return content
    // Tool calls are already included in the content
    return {
      role: 'assistant',
      content: content,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return buildToolCallResultMessages(toolCallResults, false);
  }
}
