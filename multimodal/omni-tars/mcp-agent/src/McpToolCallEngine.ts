/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getLogger, Tool, ToolCallEngine, ToolCallEnginePrepareRequestContext } from '@tarko/agent';
import {
  AgentEventStream,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  MultimodalToolCallResult,
  ParsedModelResponse,
  StreamChunkResult,
} from '@tarko/agent-interface';
import {
  parseMcpContent,
  processT5StreamingChunk as omniProcessStreamingChunk,
  T5StreamProcessingState as OmniStreamProcessingState,
  createT5InitState as createInitState,
  SYSTEM_PROMPT_GROUP,
} from '@omni-tars/core';

export class McpToolCallEngine extends ToolCallEngine<OmniStreamProcessingState> {
  private logger = getLogger('McpToolCallEngine');

  preparePrompt(instructions: string, tools: Tool[]) {
    return SYSTEM_PROMPT_GROUP;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: context.temperature || 1.0,
      top_p: context.top_p,
      stream: true,
      // For OpenAI standard stop sequence API.
      // stop: ['</code_env>', '</mcp_env>'],
      // stop_sequences: ['</code_env>', '</mcp_env>'],
    };
  }

  initStreamProcessingState(): OmniStreamProcessingState {
    return createInitState();
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: OmniStreamProcessingState,
  ): StreamChunkResult {
    return omniProcessStreamingChunk(chunk, state);
  }

  finalizeStreamProcessing(state: OmniStreamProcessingState): ParsedModelResponse {
    this.logger.info('finalizeStreamProcessing state \n', state);
    let tools = state.toolCalls;
    const fullContent = state.contentBuffer;

    // omniProcessStreamingChunk does not resolve mcp env tags, so you need to process the complete content yourself
    if (state.contentBuffer.includes('mcp_env')) {
      const extracted = parseMcpContent(fullContent);

      this.logger.info('extracted', JSON.stringify(extracted, null, 2));

      tools = extracted.tools;
    }

    return {
      content: state.accumulatedChatContentBuffer ?? fullContent,
      rawContent: fullContent,
      reasoningContent: state.reasoningBuffer ?? '',
      toolCalls: tools,
      finishReason: (tools || []).length > 0 ? 'tool_calls' : 'stop',
    };
  }

  /**
   * Generate a tool call ID
   */
  private generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extracts information from the LLM response.
   * @param content The string containing think, FunctionCall, and answer.
   */
  public parseContent(content: string): {
    answer: string;
    think: string;
    tools: ChatCompletionMessageToolCall[];
  } {
    let think = '';
    let answer = '';
    let tools: ChatCompletionMessageToolCall[] = [];

    try {
      const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
      if (thinkMatch) {
        think = thinkMatch[1].trim();
      }

      // Parse answer content - supports multiple formats
      // Format 1: <answer>content</answer>
      const answerMatch = content.match(/<answer>(.*?)<\/answer>/s);
      if (answerMatch) {
        answer = answerMatch[1].trim();
      }

      // Format 2: <|FCResponseBegin|>content</answer>
      const fcResponseMatch = content.match(/<\|FCResponseBegin\|>(.*?)<\/answer>/s);
      if (fcResponseMatch) {
        answer = fcResponseMatch[1].trim();
      }

      // Parse tool calls - handle FunctionCallBegin/End format
      const functionCallMatch = content.match(/<\|FunctionCallBegin\|>(.*?)<\|FunctionCallEnd\|>/s);
      if (functionCallMatch) {
        const functionCallContent = functionCallMatch[1];

        // Extract the JSON array part from the content
        const jsonMatch = functionCallContent.match(/\[.*\]/s);
        if (jsonMatch) {
          try {
            const toolCallsData = JSON.parse(jsonMatch[0]);
            tools = toolCallsData.map(
              (toolCall: { name: string; parameters?: Record<string, unknown> }) => ({
                id: this.generateToolCallId(),
                type: 'function' as const,
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.parameters || {}),
                },
              }),
            );
          } catch (parseError) {
            this.logger.warn('Failed to parse tool calls JSON:', parseError);
          }
        }
      } else {
        // Format 3: <|FunctionCallBegin|>thought content</think>\n[JSON array]\n</mcp_env>
        const newFormatMatch = content.match(/<\|FunctionCallBegin\|>(.*?)<\/think>\s*(\[.*?\])/s);
        if (newFormatMatch) {
          // Extract thought content (if not already extracted via <think> tag)
          if (!think) {
            think = newFormatMatch[1].trim();
          }

          // Extract and parse the JSON array
          try {
            const toolCallsData = JSON.parse(newFormatMatch[2]);
            tools = toolCallsData.map(
              (toolCall: { name: string; parameters?: Record<string, unknown> }) => ({
                id: this.generateToolCallId(),
                type: 'function' as const,
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.parameters || {}),
                },
              }),
            );
          } catch (parseError) {
            this.logger.warn('Failed to parse new format tool calls JSON:', parseError);
          }
        }
      }
      // Format 3: No FunctionCallBegin but has FunctionCallEnd
      // Example: <mcp_env>\n[JSON array]<|FunctionCallEnd|>\n</mcp_env>
      const noBeginMatch = content.match(/(\[.*?\])<\|FunctionCallEnd\|>/s);
      if (noBeginMatch) {
        try {
          const toolCallsData = JSON.parse(noBeginMatch[1]);
          tools = toolCallsData.map(
            (toolCall: { name: string; parameters?: Record<string, unknown> }) => ({
              id: this.generateToolCallId(),
              type: 'function' as const,
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.parameters || {}),
              },
            }),
          );
        } catch (parseError) {
          this.logger.warn('Failed to parse no-begin format tool calls JSON:', parseError);
        }
      }

      // If no answer tag is found, but there is content and no tool calls, use the entire content as the answer
      if (!answer && !tools.length && content.trim()) {
        // The remaining content after removing the think part is used as the answer
        let remainingContent = content;
        if (thinkMatch) {
          remainingContent = content.replace(/<think>.*?<\/think>/s, '').trim();
        }
        if (remainingContent) {
          answer = remainingContent;
        }
      }

      if (tools.length > 0) {
        // If a tool call is detected but there is no explicit answer, the answer should be empty
        answer = '';
      }
    } catch (error) {
      this.logger.error('Error parsing content:', error);
      // If parsing fails, return the original content as the answer
      answer = content;
    }

    return {
      think,
      tools,
      answer,
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return {
      role: 'assistant',
      content: currentLoopAssistantEvent.rawContent || currentLoopAssistantEvent.content,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return toolCallResults.map((result) => {
      // Extract text content from multimodal result
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      return {
        role: 'user',
        content: `Tool "${result.toolName}" result:\n${textContent}`,
      };
    });
  }
}
