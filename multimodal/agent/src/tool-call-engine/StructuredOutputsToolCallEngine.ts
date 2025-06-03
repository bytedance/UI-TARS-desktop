/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolCallEngine,
  ToolDefinition,
  PrepareRequestContext,
  ChatCompletionCreateParams,
  ChatCompletion,
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
 * StructuredOutputsToolCallEngine - Uses structured outputs (JSON Schema) for tool calls
 *
 * This approach instructs the model to return a structured JSON response
 * with tool call information, avoiding the need to parse
 * tool call markers from text content.
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
  preparePrompt(basePrompt: string, tools: ToolDefinition[]): string {
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

    // Define instructions for using structured outputs
    const structuredOutputInstructions = `
When you need to use a tool:
1. Respond with a structured JSON object with the following format:
{
  "content": "Always include a brief, concise message about what you're doing or what information you're providing. Avoid lengthy explanations.",
  "toolCall": {
    "name": "the_exact_tool_name",
    "args": {
      // The arguments as required by the tool's parameter schema
    }
  }
}
IMPORTANT: Always include both "content" and "toolCall" when using a tool. The "content" should be brief but informative.

If you want to provide a final answer without calling a tool:
{
  "content": "Your complete and helpful response to the user"
}`;

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
    // Define the schema for structured outputs
    const responseSchema = {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Your response text to the user',
        },
        toolCall: {
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
      // At least one of these fields must be present
      anyOf: [{ required: ['content'] }, { required: ['toolCall'] }],
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
   * Improved to properly handle incremental JSON content extraction
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
          const parsed = JSON.parse(repairedJson);

          // If we have a valid JSON with content field
          if (parsed && typeof parsed.content === 'string') {
            // Calculate only the new incremental content
            const newExtractedContent = parsed.content.slice(state.lastParsedContent?.length || 0);

            // Only send if we have new incremental content
            if (newExtractedContent) {
              content = newExtractedContent;
              // Update the last parsed content to the full content
              state.lastParsedContent = parsed.content;
            }

            // Check for tool call
            if (parsed.toolCall && !hasToolCallUpdate) {
              const { name, args } = parsed.toolCall;

              // Create a tool call and update state
              const toolCall: ChatCompletionMessageToolCall = {
                id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                type: 'function',
                function: {
                  name,
                  arguments: JSON.stringify(args),
                },
              };

              state.toolCalls = [toolCall];
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
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    // One final attempt to parse JSON
    try {
      const repairedJson = jsonrepair(state.contentBuffer);
      const parsed = JSON.parse(repairedJson);

      if (parsed) {
        if (parsed.toolCall) {
          // Found a tool call in the JSON
          const { name, args } = parsed.toolCall;

          // Create a tool call
          const toolCall: ChatCompletionMessageToolCall = {
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'function',
            function: {
              name,
              arguments: JSON.stringify(args),
            },
          };

          state.toolCalls = [toolCall];

          // For JSON-based responses, return only the content field
          if (parsed.content) {
            state.contentBuffer = parsed.content;
          } else {
            state.contentBuffer = '';
          }
        } else if (parsed.content) {
          // No tool call, just content
          state.contentBuffer = parsed.content;
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
   * Check if the text looks like it's likely to be JSON
   * This helps us avoid showing partial JSON to users
   */
  private isLikelyJson(text: string): boolean {
    // If it starts with whitespace followed by {, it's likely JSON
    const trimmed = text.trim();
    return (
      trimmed.startsWith('{') ||
      // Has JSON field patterns
      trimmed.includes('"content":') ||
      trimmed.includes('"toolCall":')
    );
  }

  /**
   * Try to parse JSON from a string, handling partial/invalid JSON
   */
  private tryParseJson(text: string): any {
    try {
      // Clean the text by finding the first '{' and last '}'
      const startIdx = text.indexOf('{');
      const endIdx = text.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonText = text.substring(startIdx, endIdx + 1);
        return JSON.parse(jsonText);
      }
    } catch (e) {
      // Not valid JSON yet
    }
    return null;
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
