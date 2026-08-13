/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolCallEngine,
  Tool,
  ToolCallEnginePrepareRequestContext,
  ChatCompletionCreateParams,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  MultimodalToolCallResult,
  AgentEventStream,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ParsedModelResponse,
  StreamProcessingState,
  StreamChunkResult,
  FinishReason,
} from '@tarko/agent-interface';
import { zodToJsonSchema } from '../utils';
import { getLogger } from '@tarko/shared-utils';
import { buildToolCallResultMessages } from './utils';
import { jsonrepair } from 'jsonrepair';

type ScannedJsonString =
  | { status: 'complete'; value: string; end: number }
  | { status: 'partial'; value: string; end: number }
  | { status: 'invalid'; value: string; end: number };

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

/**
 * Scans a JSON string without repairing it. For an incomplete string, only
 * characters whose representation is complete are returned. In particular,
 * escape sequences and surrogate pairs are held until their remaining input
 * arrives in a later stream chunk.
 */
function scanJsonString(text: string, start: number): ScannedJsonString {
  let value = '';
  let index = start + 1;

  while (index < text.length) {
    const character = text[index];

    if (character === '"') {
      return { status: 'complete', value, end: index + 1 };
    }

    if (character === '\\') {
      if (index + 1 >= text.length) {
        return { status: 'partial', value, end: text.length };
      }

      const escape = text[index + 1];
      if (escape !== 'u') {
        const decoded = SIMPLE_ESCAPES[escape];
        if (decoded === undefined) {
          return { status: 'invalid', value, end: index };
        }
        value += decoded;
        index += 2;
        continue;
      }

      const hex = text.slice(index + 2, index + 6);
      if (hex.length < 4) {
        return { status: 'partial', value, end: text.length };
      }
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
        return { status: 'invalid', value, end: index };
      }

      const codeUnit = Number.parseInt(hex, 16);
      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        const lowSurrogateStart = index + 6;
        const remaining = text.slice(lowSurrogateStart);

        if (
          remaining.length === 0 ||
          remaining === '\\' ||
          remaining === '\\u' ||
          (remaining.startsWith('\\u') && remaining.length < 6)
        ) {
          return { status: 'partial', value, end: text.length };
        }

        if (text.slice(lowSurrogateStart, lowSurrogateStart + 2) === '\\u') {
          const lowHex = text.slice(lowSurrogateStart + 2, lowSurrogateStart + 6);
          if (/^[0-9a-fA-F]{4}$/.test(lowHex)) {
            const lowCodeUnit = Number.parseInt(lowHex, 16);
            if (lowCodeUnit >= 0xdc00 && lowCodeUnit <= 0xdfff) {
              value += String.fromCharCode(codeUnit, lowCodeUnit);
              index = lowSurrogateStart + 6;
              continue;
            }
          }
        }
      }

      value += String.fromCharCode(codeUnit);
      index += 6;
      continue;
    }

    if (character.charCodeAt(0) < 0x20) {
      return { status: 'invalid', value, end: index };
    }

    const codeUnit = character.charCodeAt(0);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 === text.length) {
      return { status: 'partial', value, end: text.length };
    }

    value += character;
    index += 1;
  }

  return { status: 'partial', value, end: text.length };
}

/**
 * Extracts only a top-level `content` string from a possibly incomplete JSON
 * object. Nested keys and string-like text are ignored.
 */
function scanTopLevelContent(text: string): string | undefined {
  let index = 0;
  while (/\s/.test(text[index] || '')) index += 1;
  if (text[index] !== '{') return undefined;

  let depth = 1;
  index += 1;

  while (index < text.length && depth > 0) {
    const character = text[index];

    if (character === '"') {
      const token = scanJsonString(text, index);
      if (token.status !== 'complete') return undefined;

      if (depth === 1) {
        let separator = token.end;
        while (/\s/.test(text[separator] || '')) separator += 1;

        if (text[separator] === ':') {
          let valueStart = separator + 1;
          while (/\s/.test(text[valueStart] || '')) valueStart += 1;

          if (token.value === 'content') {
            if (text[valueStart] !== '"') return undefined;
            const content = scanJsonString(text, valueStart);
            return content.status === 'invalid' ? undefined : content.value;
          }

          index = valueStart;
          continue;
        }
      }

      index = token.end;
      continue;
    }

    if (character === '{' || character === '[') depth += 1;
    if (character === '}' || character === ']') depth -= 1;
    index += 1;
  }

  return undefined;
}

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
  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
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
      top_p: context.top_p,
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
        const scannedContent = scanTopLevelContent(state.contentBuffer);

        if (
          scannedContent !== undefined &&
          scannedContent.startsWith(state.lastParsedContent || '')
        ) {
          content = scannedContent.slice(state.lastParsedContent?.length || 0);
          state.lastParsedContent = scannedContent;
        }

        // Never build a tool call from repaired/incomplete JSON.
        const toolCall = this.parseCompleteToolCall(state.contentBuffer);
        if (toolCall && state.toolCalls.length === 0) {
          state.toolCalls = [toolCall];
          hasToolCallUpdate = true;
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
    const rawContent = state.contentBuffer;
    let finalContent = this.mightBeCollectingJson(rawContent)
      ? state.lastParsedContent || ''
      : rawContent;

    // One final attempt to parse JSON
    try {
      const repairedJson = jsonrepair(rawContent);
      const parsed = JSON.parse(repairedJson);

      if (parsed && typeof parsed.content === 'string') {
        finalContent = parsed.content;
      }
    } catch (e) {
      this.logger.warn(`Failed to parse JSON in final processing: ${e}`);
    }

    const toolCall = this.parseCompleteToolCall(rawContent);
    state.toolCalls = toolCall ? [toolCall] : [];

    const finishReason: FinishReason =
      state.toolCalls.length > 0 ? 'tool_calls' : state.finishReason || 'stop';

    return {
      content: finalContent,
      rawContent,
      reasoningContent: state.reasoningBuffer || undefined,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      finishReason,
    };
  }

  /**
   * Check if the text might be in the process of building a JSON object
   */
  private mightBeCollectingJson(text: string): boolean {
    return text.trimStart().startsWith('{');
  }

  /**
   * Tool calls are accepted only from syntactically complete, unmodified JSON.
   * This prevents jsonrepair from turning a truncated tool call into an
   * executable one.
   */
  private parseCompleteToolCall(text: string): ChatCompletionMessageToolCall | undefined {
    try {
      const parsed = JSON.parse(text);
      const toolCall = parsed?.toolCall;

      if (
        !toolCall ||
        typeof toolCall !== 'object' ||
        typeof toolCall.name !== 'string' ||
        toolCall.name.length === 0 ||
        !toolCall.args ||
        typeof toolCall.args !== 'object' ||
        Array.isArray(toolCall.args)
      ) {
        return undefined;
      }

      return {
        id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args),
        },
      };
    } catch {
      return undefined;
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
  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    // For structured outputs, we never use the tool_calls field
    // Instead, the JSON structure is already in the content
    return {
      role: 'assistant',
      content: currentLoopAssistantEvent.content || '',
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
