import { zodToJsonSchema } from '../utils';
import { getLogger } from '@tarko/shared-utils';
import {
  Tool,
  ToolCallEngine,
  ParsedModelResponse,
  ToolCallEnginePrepareRequestContext,
  AgentEventStream,
  MultimodalToolCallResult,
  ChatCompletionTool,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionCreateParams,
  FunctionParameters,
  ChatCompletionAssistantMessageParam,
  StreamProcessingState,
  StreamChunkResult,
  ChatCompletionMessageToolCall,
  StreamingToolCallUpdate,
} from '@tarko/agent-interface';
import { buildToolCallResultMessages } from './utils';

/**
 * A Tool Call Engine based on native Function Call.
 */
export class NativeToolCallEngine extends ToolCallEngine {
  private logger = getLogger('NativeEngine');

  preparePrompt(instructions: string, tools: Tool[]): string {
    // Function call doesn't need special prompt formatting for tools
    return instructions;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    const { model, messages, tools, temperature = 0.7, top_p } = context;

    if (!tools) {
      this.logger.debug(`Preparing request for model: ${model} without tools`);
      return {
        model,
        messages,
        temperature,
        top_p,
        stream: false,
      };
    }

    // Convert tool definitions to OpenAI format
    this.logger.debug(`Preparing request for model: ${model} with ${tools.length} tools`);
    const openAITools = tools.map<ChatCompletionTool>((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        // Use zodToJsonSchema which now handles both Zod and JSON schemas
        parameters: zodToJsonSchema(tool.schema) as FunctionParameters,
      },
    }));

    return {
      model,
      messages,
      // Only set tools field when `tools` config exists, or we woul got following error:
      // API error: InputError: Detected a 'tools' parameter,
      // but the following model does not support tools: gpt-image-1
      tools: openAITools.length > 0 ? openAITools : undefined,
      temperature,
      top_p,
      stream: false,
    };
  }

  /**
   * Initialize stream processing state for native tool calls
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
   * Process a streaming chunk for native tool calls
   * For native engines, we can directly use the tool_calls property
   */
  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;
    let content = '';
    let reasoningContent = '';
    let hasToolCallUpdate = false;
    const streamingToolCallUpdates: StreamingToolCallUpdate[] = [];

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

    // Process regular content if present
    if (delta?.content) {
      content = delta.content;
      state.contentBuffer += content;
    }

    // Process tool calls if present - native engine handles this automatically
    if (delta?.tool_calls) {
      hasToolCallUpdate = true;
      this.processToolCallsInChunk(delta.tool_calls, state.toolCalls, streamingToolCallUpdates);
    }

    // Handle completion of tool calls when finish_reason is "tool_calls"
    if (chunk.choices[0]?.finish_reason === 'tool_calls' && state.toolCalls.length > 0) {
      hasToolCallUpdate = true;
      // Emit completion events for all active tool calls
      for (const toolCall of state.toolCalls) {
        streamingToolCallUpdates.push({
          toolCallId: toolCall.id,
          toolName: toolCall.function?.name || '',
          argumentsDelta: '', // Empty delta for completion
          isComplete: true,
        });
      }
    }

    return {
      content,
      reasoningContent,
      hasToolCallUpdate,
      toolCalls: state.toolCalls,
      // Always return streaming updates - the processor will decide whether to emit events
      streamingToolCallUpdates:
        streamingToolCallUpdates.length > 0 ? streamingToolCallUpdates : undefined,
    };
  }

  /**
   * Process tool calls data from a chunk
   */
  private processToolCallsInChunk(
    toolCallParts: ChatCompletionChunk.Choice.Delta.ToolCall[],
    currentToolCalls: ChatCompletionMessageToolCall[],
    streamingToolCallUpdates: StreamingToolCallUpdate[],
  ): void {
    for (const toolCallPart of toolCallParts) {
      const toolCallIndex = toolCallPart.index;

      // Ensure the tool call exists in our buffer
      if (!currentToolCalls[toolCallIndex]) {
        currentToolCalls[toolCallIndex] = {
          id: toolCallPart.id!,
          type: toolCallPart.type!,
          function: {
            name: '',
            arguments: '',
          },
        };
      }

      const currentToolCall = currentToolCalls[toolCallIndex];
      let hasUpdate = false;
      let argumentsDelta = '';

      // Update function name if present
      if (toolCallPart.function?.name) {
        currentToolCall.function!.name = toolCallPart.function.name;
        hasUpdate = true;
      }

      // Append arguments if present
      if (toolCallPart.function?.arguments) {
        argumentsDelta = toolCallPart.function.arguments;
        currentToolCall.function!.arguments =
          (currentToolCall.function!.arguments || '') + argumentsDelta;
        hasUpdate = true;
      }

      // Create streaming update if there was any change
      if (hasUpdate) {
        streamingToolCallUpdates.push({
          toolCallId: currentToolCall.id,
          toolName: currentToolCall.function!.name || '',
          argumentsDelta,
          isComplete: false, // Incremental update, not complete yet
        });
      }
    }
  }

  /**
   * Finalize the stream processing and extract the final response
   */
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    return {
      // We do not send "rawContent" here because, in the native engine,
      // the raw content is identical to the content.
      content: state.contentBuffer,
      reasoningContent: state.reasoningBuffer || undefined,
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      finishReason: state.finishReason || 'stop',
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    const { content, toolCalls } = currentLoopAssistantEvent;
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: content,
    };

    // For OpenAI, directly use the tool_calls field
    if (toolCalls && toolCalls.length > 0) {
      message.tool_calls = toolCalls;
      this.logger.debug(`Adding ${toolCalls.length} tool calls to assistant message`);
    }

    return message;
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return buildToolCallResultMessages(toolCallResults, true);
  }
}
