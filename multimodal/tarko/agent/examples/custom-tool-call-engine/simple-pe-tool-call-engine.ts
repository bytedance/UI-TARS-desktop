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
import { zodToJsonSchema } from '../../src/utils';

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
export class SimpleKorToolCallEngine extends ToolCallEngine {
  /**
   * Prepare system prompt with tool information and instructions
   */
  preparePrompt(instructions: string, tools: Tool[]): string {
    if (!tools || tools.length === 0) {
      return instructions;
    }

    // Build simple tool descriptions
    const toolsDescription = tools
      .map((tool) => {
        const schema = zodToJsonSchema(tool.schema);
        return `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(schema)}`;
      })
      .join('\n');

    return `${instructions}

Available tools:
${toolsDescription}

When you need to use a tool, respond with this exact format:
<tool_call>
{"name": "tool_name", "arguments": {"param1": "value1", "param2": "value2"}}
</tool_call>

If you don't need to use tools, respond normally without the tool_call format.`;
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
   * Extract tool calls from complete response text
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    const fullContent = state.contentBuffer;

    // Look for tool call pattern
    const toolCallMatch = fullContent.match(/<tool_call>\s*(\{.*?\})\s*<\/tool_call>/s);
    console.log('toolCallMatch', toolCallMatch);

    if (toolCallMatch) {
      try {
        // Parse the JSON inside tool_call tags
        const toolCallData = JSON.parse(toolCallMatch[1]);

        if (toolCallData.name && toolCallData.arguments) {
          // Create tool call object
          const toolCall: ChatCompletionMessageToolCall = {
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: 'function',
            function: {
              name: toolCallData.name,
              arguments: JSON.stringify(toolCallData.arguments),
            },
          };

          // Remove tool call tags from content, keep other text
          const cleanContent = fullContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();

          return {
            content: cleanContent,
            rawContent: fullContent,
            toolCalls: [toolCall],
            finishReason: 'tool_calls',
          };
        }
      } catch (error) {
        console.error('Failed to parse tool call:', error);
      }
    }

    // No tool calls found - return regular response
    return {
      content: fullContent,
      rawContent: fullContent,
      toolCalls: undefined,
      finishReason: state.finishReason || 'stop',
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
