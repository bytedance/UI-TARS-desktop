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
import { DefaultActionParser } from '@gui-agent/action-parser';
import { getScreenInfo } from './shared';
import { GUI_ADAPTED_TOOL_NAME } from './constants';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { serializeAction } from '@gui-agent/shared/utils';

const defaultParser = new DefaultActionParser();
const defaultLogger = new ConsoleLogger('[GUIAgent:ToolCallEngine]', LogLevel.DEBUG);

/**
 * GUIAgentToolCallEngine - Minimal prompt engineering tool call engine
 *
 * This is the simplest possible implementation of a tool call engine that:
 * 1. Uses prompt engineering to instruct the LLM to output tool calls in a specific format
 * 2. Parses tool calls from LLM response text using simple regex matching
 * 3. Does not support streaming (focuses on core functionality only)
 *
 * Format used: <tool_call>{"name": "tool_name", "arguments": {...}}</tool_call>
 */
export class GUIAgentToolCallEngine extends ToolCallEngine {
  /**
   * Prepare system prompt with tool information and instructions
   */
  preparePrompt(instructions: string, tools: Tool[]): string {
    return instructions;
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
      temperature: context.temperature || 0.7,
      stream: true,
    };
  }

  /**
   * Initialize processing state (minimal implementation)
   *
   * FIXME: move to base tool call engine.
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
   * Process streaming chunks - simply accumulate content
   *
   * FIXME: make it optional
   */
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

  /**
   * Generate a tool call ID
   */
  private generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Extract tool calls from complete response text
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    defaultLogger.log('[finalizeStreamProcessing]', getScreenInfo());

    const fullContent = state.contentBuffer;
    defaultLogger.log('[finalizeStreamProcessing] fullContent', fullContent);

    const parsedGUIResponse = defaultParser.parsePrediction(fullContent);
    if (!parsedGUIResponse) {
      return {
        content: '',
        rawContent: fullContent,
      };
    }

    const toolCalls: ChatCompletionMessageToolCall[] = [];

    let finished = false;
    let finishMessage: string | null = null;
    for (const action of parsedGUIResponse.actions) {
      if (action.type === 'finished') {
        finished = true;
        finishMessage = action.inputs?.content ?? null;
        continue;
      }
      toolCalls.push({
        id: this.generateToolCallId(),
        type: 'function',
        function: {
          name: GUI_ADAPTED_TOOL_NAME,
          arguments: JSON.stringify({
            action: serializeAction(action),
            step: '',
            thought: parsedGUIResponse.reasoningContent ?? '',
            operator_action: action,
          }),
        },
      });
    }

    const content = finishMessage ?? '';
    const reasoningContent = parsedGUIResponse.reasoningContent ?? '';
    const contentForWebUI = content.replace(/\\n|\n/g, '<br>');
    const reasoningContentForWebUI = reasoningContent.replace(/\\n|\n/g, '<br>');

    // No tool calls found - return regular response
    return {
      content: contentForWebUI,
      rawContent: fullContent,
      reasoningContent: reasoningContentForWebUI,
      toolCalls,
      finishReason: toolCalls.length > 0 && !finished ? 'tool_calls' : 'stop',
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
}
