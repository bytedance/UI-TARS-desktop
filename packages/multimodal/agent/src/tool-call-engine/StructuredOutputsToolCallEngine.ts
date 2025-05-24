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
  MultimodalToolCallResult,
  AgentSingleLoopReponse,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ParsedModelResponse,
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
  "content": "Optional text to show to the user alongside the tool call",
  "toolCall": {
    "name": "the_exact_tool_name",
    "args": {
      // The arguments as required by the tool's parameter schema
    }
  }
}

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
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
   * @param response The agent's response
   * @returns Formatted message parameter for conversation history
   */
  buildHistoricalAssistantMessage(response: AgentSingleLoopReponse): ChatCompletionMessageParam {
    if (response.toolCalls && response.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.toolCalls,
      };
    }

    return {
      role: 'assistant',
      content: response.content || '',
    };
  }

  /**
   * Build historical tool call result messages for conversation history
   *
   * @param results The tool call results
   * @returns Array of formatted message parameters
   */
  buildHistoricalToolCallResultMessages(
    results: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return results.map((result) => ({
      role: 'tool',
      tool_call_id: result.toolCallId,
      name: result.toolName,
      content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
    }));
  }
}
