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
   */
  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
    };
  }

  /**
   * Process a streaming chunk for structured outputs
   * For JSON-formatted responses, we collect the JSON until it's complete
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

      // Always accumulate for JSON parsing attempt
      const updatedBuffer = state.contentBuffer + newContent;

      // If we're currently collecting JSON (potentially), don't output content yet
      if (this.mightBeCollectingJson(updatedBuffer)) {
        // Try to parse JSON if we have a complete structure
        try {
          const jsonContent = this.tryParseJson(updatedBuffer);
          if (jsonContent) {
            // Successfully parsed JSON
            if (jsonContent.toolCall) {
              // Found a tool call in the JSON
              const { name, args } = jsonContent.toolCall;

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

              // For JSON-based responses, extract and store only the content field
              if (jsonContent.content) {
                // Reset content buffer to just contain the extracted content
                state.contentBuffer = jsonContent.content;
                // Return the content in this chunk for streaming
                content = jsonContent.content;
              } else {
                state.contentBuffer = '';
                content = '';
              }
            } else if (jsonContent.content) {
              // If it's just content in the JSON (no tool call)
              state.contentBuffer = jsonContent.content;
              content = jsonContent.content;
            } else {
              // JSON with no recognizable fields
              state.contentBuffer = updatedBuffer;
              content = newContent;
            }
          } else {
            // Accumulate but don't output yet if it looks like we're building JSON
            state.contentBuffer = updatedBuffer;
            content = this.isLikelyJson(updatedBuffer) ? '' : newContent;
          }
        } catch (e) {
          // Not valid JSON yet, continue accumulating
          state.contentBuffer = updatedBuffer;
          content = this.isLikelyJson(updatedBuffer) ? '' : newContent;
        }
      } else {
        // Not in JSON mode, just add content normally
        state.contentBuffer += newContent;
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
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    // One final attempt to parse JSON
    try {
      const jsonContent = this.tryParseJson(state.contentBuffer);
      if (jsonContent) {
        if (jsonContent.toolCall) {
          // Found a tool call in the JSON
          const { name, args } = jsonContent.toolCall;

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
          if (jsonContent.content) {
            state.contentBuffer = jsonContent.content;
          } else {
            state.contentBuffer = '';
          }
        } else if (jsonContent.content) {
          // No tool call, just content
          state.contentBuffer = jsonContent.content;
        }
      }
    } catch (e) {
      // If we can't parse JSON at this point, just use the raw content
      // But check if it looks like incomplete JSON and strip it if so
      if (this.isLikelyJson(state.contentBuffer)) {
        this.logger.warn(`Found unparseable JSON-like content in final processing, stripping it`);
        state.contentBuffer = '';
      } else {
        this.logger.warn(`Failed to parse JSON in final processing: ${e}`);
      }
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
   * @deprecated Use stream processing methods instead
   * Parse the response from the LLM
   *
   * @param response The LLM response
   * @returns Parsed response with content and tool calls separated
   */
  async parseResponse(response: ChatCompletion): Promise<ParsedModelResponse> {
    const content = response.choices[0]?.message?.content || '';
    const finishReason = response.choices[0]?.finish_reason || 'stop';

    try {
      // Parse the JSON response
      const parsedContent = JSON.parse(content);

      // Extract content if available
      const responseContent = parsedContent.content || '';

      // Check if this is a tool call
      if (parsedContent.toolCall) {
        // Create a tool call
        const toolCall: ChatCompletionMessageToolCall = {
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          type: 'function',
          function: {
            name: parsedContent.toolCall.name,
            arguments: JSON.stringify(parsedContent.toolCall.args),
          },
        };

        this.logger.info(`Parsed tool call: ${toolCall.function.name}`);

        return {
          content: responseContent, // Use content alongside tool call
          toolCalls: [toolCall],
          finishReason,
        };
      }

      // Return content only (no tool call)
      return {
        content: responseContent,
        finishReason,
      };
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${error}`);

      // Return original content if parsing fails
      return {
        content,
        finishReason,
      };
    }
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
    const messages: ChatCompletionMessageParam[] = [];

    for (const result of results) {
      // Check if content contains non-text elements (like images)
      const hasNonTextContent = result.content.some((part) => part.type !== 'text');

      // Extract plain text content
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      // Add text result as a user message
      messages.push({
        role: 'user',
        content: `Tool result for ${result.toolName}: ${textContent}`,
      });

      // If there's non-text content (like images), add as a separate user message
      if (hasNonTextContent) {
        const nonTextParts = result.content.filter((part) => part.type !== 'text');
        messages.push({
          role: 'user',
          content: nonTextParts,
        });
      }
    }

    return messages;
  }
}
