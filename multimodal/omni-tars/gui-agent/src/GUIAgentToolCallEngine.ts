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
} from '@tarko/agent-interface';
import { actionParser, actionStringParser } from '@gui-agent/action-parser';
import { getScreenInfo } from './shared';
import {
  processT5StreamingChunk as omniProcessStreamingChunk,
  T5StreamProcessingState as OmniStreamProcessingState,
  createT5InitState as createInitState,
  SYSTEM_PROMPT_GROUP,
} from '@omni-tars/core';
import { getLogger } from '@tarko/agent';
import { GUIAgentT5Adapter } from './GUIAgentT5Adapter';

/**
 * SimpleKorToolCallEngine - Minimal prompt engineering tool call engine
 *
 * This is the simplest possible implementation of a tool call engine that:
 * 1. Uses prompt engineering to instruct the LLM to output tool calls in a specific format
 * 2. Parses tool calls from LLM response text using simple regex matching
 * 3. Does not support streaming (focuses on core functionality only)
 *
 * Format used: <tool_call>{"name": "tool_name", "arguments": {...}}</tool_call>
 */
export class GUIAgentToolCallEngine extends ToolCallEngine {
  private logger = getLogger('GUIAgentToolCallEngine');
  private t5Adapter = new GUIAgentT5Adapter(this.logger);

  /**
   * Prepare system prompt with tool information and instructions
   */
  preparePrompt(instructions: string, tools: Tool[]) {
    return SYSTEM_PROMPT_GROUP;
  }

  /**
   * Prepare request parameters for the LLM
   *
   * FIXME: move to base tool call engine.
   */
  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: context.temperature || 1.0,
      top_p: context.top_p,
      stream: true,
    };
  }

  /**
   * Initialize processing state (minimal implementation)
   *
   * FIXME: move to base tool call engine.
   */
  initStreamProcessingState(): OmniStreamProcessingState {
    return createInitState();
  }

  /**
   * Process streaming chunks - simply accumulate content
   */
  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: OmniStreamProcessingState,
  ): StreamChunkResult {
    return omniProcessStreamingChunk(chunk, state);
  }

  /**
   * Extract tool calls from complete response text
   */
  finalizeStreamProcessing(state: OmniStreamProcessingState): ParsedModelResponse {
    const fullContent = state.contentBuffer;
    this.logger.debug('finalizeStreamProcessing fullContent:', fullContent);

    const toolCalls = state.toolCalls;
    this.logger.debug('finalizeStreamProcessing toolCalls:', toolCalls);

    const convertedToolCalls = this.t5Adapter.convertToolsToOperatorActions(
      toolCalls,
      state.reasoningBuffer ?? '',
    );

    return {
      content: state.accumulatedChatContentBuffer ?? fullContent,
      rawContent: fullContent,
      reasoningContent: state.reasoningBuffer ?? '',
      toolCalls: convertedToolCalls,
      finishReason: (toolCalls || []).length > 0 ? 'tool_calls' : 'stop',
    };
  }

  /**
   * Build assistant message for conversation history
   * For PE engines, we preserve the raw content including tool call markup
   *
   * FIXME: move to base tool call engine.
   */
  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return {
      role: 'assistant',
      content: currentLoopAssistantEvent.rawContent || currentLoopAssistantEvent.content,
    };
  }

  /**
   * Build tool result messages as user messages
   * PE engines format tool results as user input for next iteration
   *
   * FIXME: move to base tool call engine.
   */
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

  /**
   * Generate a tool call ID
   */
  private generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
