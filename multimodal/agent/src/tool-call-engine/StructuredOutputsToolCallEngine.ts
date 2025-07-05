/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolCallEngine,
  Tool,
  PrepareRequestContext,
  ChatCompletionCreateParams,
  ChatCompletionChunk,
  MultimodalToolCallResult,
  AgentSingleLoopReponse,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ParsedModelResponse,
  StreamProcessingState,
  StreamChunkResult,
  FinishReason,
} from '@multimodal/agent-interface';
import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { buildToolCallResultMessages } from './utils';
import { jsonrepair } from 'jsonrepair';

/**
 * Parsed JSON response structure for structured outputs
 */
interface StructuredResponse {
  thought?: string;
  finalAnswer?: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
}

/**
 * StructuredOutputsToolCallEngine - Uses structured outputs (JSON Schema) for tool calls
 *
 * This approach instructs the model to return a structured JSON response
 * with tool call information, avoiding the need to parse
 * tool call markers from text content.
 *
 * Supports multiple tool calls in a single response and provides
 * a clear separation between final answers and tool invocations.
 */
export class StructuredOutputsToolCallEngine implements ToolCallEngine {
  private logger = getLogger('StructuredOutputsToolCallEngine');

  /**
   * Prepare the system prompt with tool definitions
   *
   * @param basePrompt The base system prompt
   * @param tools Available tools for the agent
   * @returns Enhanced system prompt with tool information
   */
  preparePrompt(basePrompt: string, tools: Tool[]): string {
    if (!tools.length) {
      return basePrompt;
    }

    // Define tools section
    const toolsSection = tools
      .map((tool) => {
        const schema = tool.hasJsonSchema?.() ? tool.schema : zodToJsonSchema(tool.schema);

        return `
Tool name: ${tool.name}
Description: ${tool.description}
Parameters: ${JSON.stringify(schema, null, 2)}`;
      })
      .join('\n\n');

    // Define instructions for using structured outputs with multiple tool calls support
    const structuredOutputInstructions = `
CRITICAL: You MUST respond with ONLY valid JSON. No other text is allowed before, after, or around the JSON.

When you need to use one or more tools:
{
  "thought": "A brief, concise message about what you're doing or what information you're providing. Avoid lengthy explanations.",
  "toolCalls": [
    {
      "name": "exact_tool_name",
      "args": {
        // The arguments as required by the tool's parameter schema
      }
    }
    // Add more tool calls if needed
  ]
}

If you want to provide a final answer without calling tools:
{
  "finalAnswer": "Your complete and helpful response to the user"
}

IMPORTANT: Use "toolCalls" (array) for tool invocations and "finalAnswer" for your final response.`;

    // Combine everything
    return `${basePrompt}

AVAILABLE TOOLS:
${toolsSection}

${structuredOutputInstructions}`;
  }

  /**
   * Prepare the request parameters for the LLM call
   *
   * @param context The request context
   * @returns ChatCompletionCreateParams with structured outputs configuration
   */
  prepareRequest(context: PrepareRequestContext): ChatCompletionCreateParams {
    // Define the schema for structured outputs with multiple tool calls support
    const responseSchema = {
      type: 'object',
      properties: {
        thought: {
          type: 'string',
          description:
            "A brief, concise message about what you're doing or what information you're providing. Avoid lengthy explanations.",
        },
        finalAnswer: {
          type: 'string',
          description: 'Your final response text to the user',
        },
        toolCalls: {
          type: 'array',
          description: 'Array of tool calls to execute',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The exact name of the tool to call',
              },
              args: {
                type: 'object',
                description: 'The arguments for the tool call',
              },
            },
            required: ['name', 'args'],
          },
        },
      },
    };

    // Basic parameters
    const params: ChatCompletionCreateParams = {
      messages: context.messages,
      model: context.model,
      temperature: context.temperature || 0.7,
      stream: true,
    };

    // Add tools if available
    if (context.tools && context.tools.length > 0) {
      // Use JSON Schema response format where supported
      params.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'agent_response_schema',
          strict: true,
          schema: responseSchema,
        },
      };
    }

    return params;
  }

  /**
   * Initialize stream processing state for structured outputs
   * Adding lastExtractedContent to track what's been extracted from JSON for incremental updates
   */
  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
      lastParsedContent: '', // Tracks the last successfully extracted content
    };
  }

  /**
   * Process a streaming chunk for structured outputs
   * Improved to properly handle incremental JSON content extraction and multiple tool calls
   */
  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;
    let content = '';
    let reasoningContent = '';
    let hasToolCallUpdate = false;

    // Extract finish reason if present
    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    // Process reasoning content if present
    // @ts-expect-error Not in OpenAI types but present in compatible LLMs
    if (delta?.reasoning_content) {
      // @ts-expect-error
      reasoningContent = delta.reasoning_content;
      state.reasoningBuffer += reasoningContent;
    }

    // Process regular content
    if (delta?.content) {
      const newContent = delta.content;

      // Accumulate new content in buffer for JSON parsing
      state.contentBuffer += newContent;

      // Try to extract content from JSON as it comes in
      if (this.mightBeCollectingJson(state.contentBuffer)) {
        try {
          // Try to repair and parse the potentially incomplete JSON
          const repairedJson = jsonrepair(state.contentBuffer);
          const parsed = JSON.parse(repairedJson) as StructuredResponse;

          // Handle finalAnswer (new format)
          if (parsed && typeof parsed.finalAnswer === 'string') {
            // Calculate only the new incremental content
            const newExtractedContent = parsed.finalAnswer.slice(
              state.lastParsedContent?.length || 0,
            );

            // Only send if we have new incremental content
            if (newExtractedContent) {
              content = newExtractedContent;
              // Update the last parsed content to the full content
              state.lastParsedContent = parsed.finalAnswer;
            }
          }

          // Handle multiple tool calls (new format)
          if (parsed.toolCalls && Array.isArray(parsed.toolCalls) && !hasToolCallUpdate) {
            const convertedToolCalls = this.convertToToolCallFormat(parsed.toolCalls);
            if (convertedToolCalls.length > 0) {
              state.toolCalls = convertedToolCalls;
              hasToolCallUpdate = true;
            }
          }
        } catch (e) {
          // JSON parsing failed - this is expected for incomplete JSON
          // Don't send any content in this case
          content = '';
        }
      } else {
        // If not collecting JSON, pass through the content directly
        content = newContent;
      }
    }

    return {
      content,
      reasoningContent,
      hasToolCallUpdate,
      toolCalls: state.toolCalls,
    };
  }

  /**
   * Convert structured tool calls to OpenAI format
   *
   * @param toolCalls Array of structured tool calls
   * @returns Array of ChatCompletionMessageToolCall objects
   */
  private convertToToolCallFormat(
    toolCalls: Array<{ name: string; args: Record<string, any> }>,
  ): ChatCompletionMessageToolCall[] {
    return toolCalls.map((toolCall, index) => ({
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`,
      type: 'function' as const,
      function: {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.args),
      },
    }));
  }

  /**
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    // One final attempt to parse JSON
    try {
      const repairedJson = jsonrepair(state.contentBuffer);
      const parsed = JSON.parse(repairedJson) as StructuredResponse;

      if (parsed) {
        // Handle multiple tool calls (new format)
        if (parsed.toolCalls && Array.isArray(parsed.toolCalls)) {
          const convertedToolCalls = this.convertToToolCallFormat(parsed.toolCalls);
          if (convertedToolCalls.length > 0) {
            state.toolCalls = convertedToolCalls;
          }

          // For JSON-based responses, clear content buffer as we have tool calls
          state.contentBuffer = '';
        }

        // Handle legacy content format
        else if (parsed.thought) {
          state.contentBuffer = parsed.thought;
        }

        // Handle final answer (new format)
        else if (parsed.finalAnswer) {
          state.contentBuffer = parsed.finalAnswer;
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to parse JSON in final processing: ${e}`);
    }

    const finishReason: FinishReason =
      state.toolCalls.length > 0 ? 'tool_calls' : state.finishReason || 'stop';

    return {
      content: state.contentBuffer,
      reasoningContent: state.reasoningBuffer || undefined,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      finishReason,
    };
  }

  /**
   * Check if the text might be in the process of building a JSON object
   */
  private mightBeCollectingJson(text: string): boolean {
    // If it contains an opening brace but not a balancing number of closing braces
    return text.includes('{');
  }

  /**
   * Build a historical assistant message for conversation history
   *
   * For structured outputs, we maintain the original content without tool_calls
   * to ensure compatibility with our JSON schema approach.
   *
   * @param response The agent's response
   * @returns Formatted message parameter for conversation history
   */
  buildHistoricalAssistantMessage(response: AgentSingleLoopReponse): ChatCompletionMessageParam {
    // For structured outputs, we never use the tool_calls field
    // Instead, the JSON structure is already in the content
    return {
      role: 'assistant',
      content: response.content || '',
    };
  }

  /**
   * Build historical tool call result messages for conversation history
   *
   * For structured outputs engine, we format results as user messages
   * to maintain consistency with our JSON schema approach.
   *
   * @param results The tool call results
   * @returns Array of formatted message parameters
   */
  buildHistoricalToolCallResultMessages(
    results: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return buildToolCallResultMessages(results, false);
  }
}
