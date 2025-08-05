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
  StreamProcessingState,
} from '@tarko/agent-interface';

export class SeedMCPAgentToolCallEngine extends ToolCallEngine {
  private logger = getLogger('SeedMCPAgentToolCallEngine');

  preparePrompt(instructions: string, tools: Tool[]): string {
    return instructions;
  }
  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: context.temperature || 0.7,
      stream: true,
    };
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;

    // Accumulate content
    if (delta?.content) {
      state.contentBuffer += delta.content;
    }

    // Record finish reason
    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    // Return incremental content without tool call detection during streaming
    return {
      content: delta?.content || '',
      reasoningContent: '',
      hasToolCallUpdate: false,
      toolCalls: [],
    };
  }
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    const fullContent = state.contentBuffer;
    this.logger.info('finalizeStreamProcessing content \n', fullContent);

    const extracted = this.parseContent(fullContent);

    this.logger.info('extracted', JSON.stringify(extracted, null, 2));

    const { think, tools, answer } = extracted;

    return {
      content: answer ?? fullContent,
      rawContent: fullContent,
      reasoningContent: think ?? '',
      toolCalls: tools,
      finishReason: tools.length > 0 ? 'tool_calls' : 'stop',
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

  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
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
