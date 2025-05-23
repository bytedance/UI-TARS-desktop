/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent } from '../agent';
import { getLLMClient } from '../llm-client';
import { MessageHistory } from '../message-history';
import {
  EventStream,
  EventType,
  AgentReasoningOptions,
  PrepareRequestContext,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ToolCallEngine,
  ChatCompletionMessageToolCall,
  AgentContextAwarenessOptions,
} from '@multimodal/agent-interface';
import { ResolvedModel } from '../../utils/model-resolver';
import { getLogger } from '../../utils/logger';
import { reconstructCompletion } from '../../utils/stream-utils';
import { ToolProcessor } from './tool-processor';
import { OpenAI } from 'openai';

/**
 * LLMProcessor - Responsible for LLM interaction
 *
 * This class handles preparing requests to the LLM, processing responses,
 * and managing streaming vs. non-streaming interactions.
 */
export class LLMProcessor {
  private logger = getLogger('LLMProcessor');
  private messageHistory: MessageHistory;
  private customLLMClient?: OpenAI;

  constructor(
    private agent: Agent,
    private eventStream: EventStream,
    private toolProcessor: ToolProcessor,
    private reasoningOptions: AgentReasoningOptions,
    private maxTokens?: number,
    private temperature: number = 0.7,
    private contextAwarenessOptions?: AgentContextAwarenessOptions,
  ) {
    this.messageHistory = new MessageHistory(
      this.eventStream,
      this.contextAwarenessOptions?.maxImagesCount,
    );
  }

  /**
   * Custom LLM client for testing or custom implementations
   *
   * @param customLLMClient - OpenAI-compatible llm client
   */
  public setCustomLLMClient(client: OpenAI): void {
    this.customLLMClient = client;
  }

  /**
   * Process an LLM request for a single iteration
   *
   * @param resolvedModel The resolved model configuration
   * @param systemPrompt The configured base system prompt
   * @param toolCallEngine The tool call engine to use
   * @param sessionId Session identifier
   * @param streamingMode Whether to operate in streaming mode
   * @param iteration Current iteration number for logging
   * @param abortSignal Optional signal to abort the execution
   */
  async processRequest(
    resolvedModel: ResolvedModel,
    systemPrompt: string,
    toolCallEngine: ToolCallEngine,
    sessionId: string,
    streamingMode: boolean,
    iteration: number,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Check if operation was aborted
    if (abortSignal?.aborted) {
      this.logger.info(`[LLM] Request processing aborted`);
      return;
    }

    try {
      // Allow the agent to perform any pre-iteration setup
      try {
        await this.agent.onEachAgentLoopStart(sessionId);
        this.logger.debug(`[Agent] Pre-iteration hook executed for iteration ${iteration}`);
      } catch (error) {
        this.logger.error(`[Agent] Error in pre-iteration hook: ${error}`);
      }

      // Get available tools
      const tools = this.toolProcessor.getTools();
      if (tools.length) {
        this.logger.info(
          `[Tools] Available: ${tools.length} | Names: ${tools.map((t) => t.name).join(', ')}`,
        );
      }

      // Build messages for current iteration including enhanced system message
      const messages = this.messageHistory.toMessageHistory(toolCallEngine, systemPrompt, tools);

      this.logger.info(`[LLM] Requesting ${resolvedModel.provider}/${resolvedModel.model}`);

      // Prepare request context
      const prepareRequestContext: PrepareRequestContext = {
        model: resolvedModel.model,
        messages,
        tools: tools,
        temperature: this.temperature,
      };

      // Process the request
      const startTime = Date.now();
      await this.sendRequest(
        resolvedModel,
        prepareRequestContext,
        sessionId,
        toolCallEngine,
        streamingMode,
        abortSignal,
      );

      const duration = Date.now() - startTime;
      this.logger.info(`[LLM] Response received | Duration: ${duration}ms`);
    } catch (error) {
      // Don't log aborted requests as errors
      if (abortSignal?.aborted) {
        this.logger.info(`[LLM] Error processing request: ${error}`);
      } else {
        this.logger.error(`[LLM] Error processing request: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Send the actual request to the LLM and process the response
   */
  private async sendRequest(
    resolvedModel: ResolvedModel,
    context: PrepareRequestContext,
    sessionId: string,
    toolCallEngine: ToolCallEngine,
    streamingMode: boolean,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Check if operation was aborted
    if (abortSignal?.aborted) {
      this.logger.info(`[LLM] Request sending aborted`);
      return;
    }

    try {
      // Prepare the request using the tool call engine
      const requestOptions = toolCallEngine.prepareRequest(context);

      // Set max tokens limit
      requestOptions.max_tokens = this.maxTokens;
      // Always enable streaming internally for performance
      requestOptions.stream = true;

      // Use either the custom LLM client or create one using model resolver
      const client =
        this.customLLMClient ||
        getLLMClient(
          resolvedModel,
          this.reasoningOptions,
          // Pass session ID to request interceptor hook
          (provider, request, baseURL) => {
            this.agent.onLLMRequest(sessionId, {
              provider,
              request,
              baseURL,
            });
            // Currently we ignore any modifications to the request
            return request;
          },
        );

      this.logger.info(
        `[LLM] Sending streaming request to ${resolvedModel.provider} | SessionId: ${sessionId}`,
      );

      // Make the streaming request with abort signal if available
      const options: ChatCompletionCreateParams = { ...requestOptions };
      const stream = (await client.chat.completions.create(options, {
        signal: abortSignal,
      })) as unknown as AsyncIterable<ChatCompletionChunk>;

      await this.handleStreamingResponse(
        stream,
        resolvedModel,
        sessionId,
        toolCallEngine,
        streamingMode,
        abortSignal,
      );
    } catch (error) {
      // Handle abort errors specifically
      if ((error instanceof Error && error.name === 'AbortError') || abortSignal?.aborted) {
        this.logger.info(`[LLM] Request aborted: ${error}`);

        // Add system event for aborted request
        const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
          level: 'info',
          message: `LLM request aborted`,
          details: { provider: resolvedModel.provider },
        });
        this.eventStream.sendEvent(systemEvent);

        return;
      }

      // Other API errors
      this.logger.error(`[LLM] API error: ${error} | Provider: ${resolvedModel.provider}`);

      // Add system event for LLM API error
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'error',
        message: `LLM API error: ${error}`,
        details: { error: String(error), provider: resolvedModel.provider },
      });
      this.eventStream.sendEvent(systemEvent);

      // Add error message as assistant response
      const errorMessage = `Sorry, an error occurred while processing your request: ${error}`;
      const assistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: errorMessage,
        finishReason: 'error',
      });
      this.eventStream.sendEvent(assistantEvent);

      // Let the error propagate to be handled by caller
      throw error;
    }
  }

  /**
   * Handle streaming response from LLM
   * Processes chunks, accumulates content, and handles tool calls
   */
  private async handleStreamingResponse(
    stream: AsyncIterable<ChatCompletionChunk>,
    resolvedModel: ResolvedModel,
    sessionId: string,
    toolCallEngine: ToolCallEngine,
    streamingMode: boolean,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Collect all chunks for final onLLMResponse call
    const allChunks: ChatCompletionChunk[] = [];

    // Buffer variables for consolidating chunks
    let reasoningBuffer = '';
    let contentBuffer = '';
    const currentToolCalls: ChatCompletionMessageToolCall[] = [];
    let finishReason: string | null = null;

    // Generate a unique message ID to correlate streaming messages with final message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    try {
      this.logger.info(`llm stream start`);

      // Process each incoming chunk
      for await (const chunk of stream) {
        // Check if operation was aborted
        if (abortSignal?.aborted) {
          this.logger.info(`[LLM] Streaming response processing aborted`);
          break;
        }

        allChunks.push(chunk);

        // Extract delta from the chunk
        const delta = chunk.choices[0]?.delta;

        // Extract finish reason if present
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // Process reasoning content
        // @ts-expect-error Not in OpenAI types but present in compatible LLMs
        if (delta?.reasoning_content) {
          // @ts-expect-error
          const reasoningContent = delta.reasoning_content;
          reasoningBuffer += reasoningContent;

          // Only send thinking streaming events in streaming mode
          if (streamingMode) {
            // Create thinking streaming event
            const thinkingEvent = this.eventStream.createEvent(
              EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
              {
                content: reasoningContent,
                isComplete: Boolean(finishReason),
              },
            );
            this.eventStream.sendEvent(thinkingEvent);
          }
        }

        // Process regular content
        if (delta?.content) {
          const content = delta.content;
          contentBuffer += content;

          // Only send content streaming events in streaming mode
          if (streamingMode) {
            // Create content streaming event
            const messageEvent = this.eventStream.createEvent(
              EventType.ASSISTANT_STREAMING_MESSAGE,
              {
                content: content,
                isComplete: Boolean(finishReason),
                messageId: messageId, // Add the message ID to correlate with final message
              },
            );
            this.eventStream.sendEvent(messageEvent);
          }
        }

        // Process tool calls
        if (delta?.tool_calls) {
          this.processToolCallsInChunk(delta.tool_calls, currentToolCalls);

          if (currentToolCalls.length > 0 && streamingMode) {
            // Create tool call streaming event (only in streaming mode)
            const toolCallEvent = this.eventStream.createEvent(
              EventType.ASSISTANT_STREAMING_MESSAGE,
              {
                content: '',
                toolCalls: [...currentToolCalls],
                isComplete: Boolean(finishReason),
                messageId: messageId, // Add the message ID to correlate with final message
              },
            );
            this.eventStream.sendEvent(toolCallEvent);
          }
        }
      }

      // Check if operation was aborted after processing chunks
      if (abortSignal?.aborted) {
        this.logger.info(`[LLM] Streaming response processing aborted after chunks`);
        return;
      }

      // Reconstruct the complete response object for parsing
      const reconstructedCompletion = reconstructCompletion(allChunks);

      this.logger.infoWithData(
        `llm stream finished, reconstructed completion`,
        reconstructedCompletion,
        JSON.stringify,
      );

      // Use the tool call engine to parse the response
      const parsedResponse = await toolCallEngine.parseResponse(reconstructedCompletion);

      this.logger.infoWithData('Parsed Response', parsedResponse, JSON.stringify);

      // If it is the prompt engineering engine, we need to use the parsed toolCalls
      if (parsedResponse.toolCalls && parsedResponse.toolCalls.length > 0) {
        // Update currentToolCalls to the parsed result
        currentToolCalls.length = 0;
        parsedResponse.toolCalls.forEach((toolCall) => currentToolCalls.push(toolCall));
        finishReason = parsedResponse.finishReason || finishReason;
        contentBuffer = parsedResponse.content || contentBuffer;
      }

      // Create the final events based on accumulated content
      this.createFinalEvents(
        contentBuffer,
        currentToolCalls,
        reasoningBuffer,
        finishReason || 'stop',
        messageId, // Pass the message ID to final events
      );

      // Call response hooks with session ID
      console.time('onLLMResponse');
      this.agent.onLLMResponse(sessionId, {
        provider: resolvedModel.provider,
        response: reconstructedCompletion,
      });
      console.timeEnd('onLLMResponse');

      this.agent.onLLMStreamingResponse(sessionId, {
        provider: resolvedModel.provider,
        chunks: allChunks,
      });

      this.logger.info(
        `[LLM] Streaming response completed from ${resolvedModel.provider} | SessionId: ${sessionId}`,
      );

      // Process any tool calls

      if (currentToolCalls.length > 0 && !abortSignal?.aborted) {
        const toolNames = currentToolCalls.map((tc) => tc.function?.name).join(', ');
        this.logger.info(
          `[Tools] LLM requested ${currentToolCalls.length} tool executions: ${toolNames}`,
        );

        // Process each tool call
        await this.toolProcessor.processToolCalls(currentToolCalls, sessionId, abortSignal);
      }
    } catch (error) {
      // Don't log aborted requests as errors
      if (abortSignal?.aborted) {
        this.logger.info(`[LLM] Streaming process aborted: ${error}`);
      } else {
        this.logger.error(
          `[LLM] Streaming process error: ${error} | Provider: ${resolvedModel.provider}`,
        );

        // Add system event for LLM API error
        const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
          level: 'error',
          message: `LLM Streaming process error: ${error}`,
          details: { error: String(error), provider: resolvedModel.provider },
        });
        this.eventStream.sendEvent(systemEvent);
      }

      // Call streaming response hook even with error
      this.agent.onLLMStreamingResponse(sessionId, {
        provider: resolvedModel.provider,
        chunks: allChunks,
      });

      throw error;
    }
  }

  /**
   * Process tool calls data from a chunk
   */
  private processToolCallsInChunk(toolCallParts: any[], currentToolCalls: Partial<any>[]): void {
    for (const toolCallPart of toolCallParts) {
      const toolCallIndex = toolCallPart.index;

      // Ensure the tool call exists in our buffer
      if (!currentToolCalls[toolCallIndex]) {
        currentToolCalls[toolCallIndex] = {
          id: toolCallPart.id,
          type: toolCallPart.type,
          function: {
            name: '',
            arguments: '',
          },
        };
      }

      // Update function name if present
      if (toolCallPart.function?.name) {
        currentToolCalls[toolCallIndex].function!.name = toolCallPart.function.name;
      }

      // Append arguments if present
      if (toolCallPart.function?.arguments) {
        currentToolCalls[toolCallIndex].function!.arguments =
          (currentToolCalls[toolCallIndex].function!.arguments || '') +
          toolCallPart.function.arguments;
      }
    }
  }

  /**
   * Create the final events from accumulated content
   */
  private createFinalEvents(
    contentBuffer: string,
    currentToolCalls: Partial<any>[],
    reasoningBuffer: string,
    finishReason: string,
    messageId?: string, // Add messageId parameter
  ): void {
    // If we have complete content, create a consolidated assistant message event
    if (contentBuffer || currentToolCalls.length > 0) {
      const assistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: contentBuffer,
        toolCalls: currentToolCalls.length > 0 ? (currentToolCalls as any[]) : undefined,
        finishReason: finishReason,
        messageId: messageId, // Include the message ID in the final message
      });

      this.eventStream.sendEvent(assistantEvent);
    }

    // If we have complete reasoning content, create a consolidated thinking message event
    if (reasoningBuffer) {
      const thinkingEvent = this.eventStream.createEvent(EventType.ASSISTANT_THINKING_MESSAGE, {
        content: reasoningBuffer,
        isComplete: true,
      });

      this.eventStream.sendEvent(thinkingEvent);
    }
  }
}
