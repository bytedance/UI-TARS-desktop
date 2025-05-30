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
  PrepareRequestContext,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ToolCallEngine,
  ChatCompletion,
  AgentContextAwarenessOptions,
} from '@multimodal/agent-interface';
import { ResolvedModel, LLMReasoningOptions, OpenAI } from '@multimodal/model-provider';
import { getLogger } from '../../utils/logger';
import { ToolProcessor } from './tool-processor';

/**
 * LLMProcessor - Responsible for LLM interaction
 *
 * This class handles preparing requests to the LLM, processing responses,
 * and managing streaming vs. non-streaming interactions.
 */
export class LLMProcessor {
  private logger = getLogger('LLMProcessor');
  private messageHistory: MessageHistory;
  private llmClient?: OpenAI;

  constructor(
    private agent: Agent,
    private eventStream: EventStream,
    private toolProcessor: ToolProcessor,
    private reasoningOptions: LLMReasoningOptions,
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
   * @param llmClient - OpenAI-compatible llm client
   */
  public setCustomLLMClient(client: OpenAI): void {
    this.llmClient = client;
  }

  /**
   * Get the current LLM client (custom or created on demand)
   *
   * @returns The current OpenAI-compatible LLM client
   */
  public getCurrentLLMClient(): OpenAI | undefined {
    return this.llmClient;
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

    // Create llm client
    if (!this.llmClient) {
      this.llmClient = getLLMClient(
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
      this.logger.info(
        `[LLM] Sending streaming request to ${resolvedModel.provider} | SessionId: ${sessionId}`,
      );

      // Make the streaming request with abort signal if available
      const options: ChatCompletionCreateParams = { ...requestOptions };
      const stream = (await this.llmClient!.chat.completions.create(options, {
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

    // Initialize stream processing state
    const processingState = toolCallEngine.initStreamProcessingState();

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

        // Process the chunk using the tool call engine
        const chunkResult = toolCallEngine.processStreamingChunk(chunk, processingState);

        // Only send streaming events in streaming mode
        if (streamingMode) {
          // Send reasoning content if any
          if (chunkResult.reasoningContent) {
            // Create thinking streaming event
            const thinkingEvent = this.eventStream.createEvent(
              EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
              {
                content: chunkResult.reasoningContent,
                isComplete: Boolean(processingState.finishReason),
              },
            );
            this.eventStream.sendEvent(thinkingEvent);
          }

          // Only send content chunk if it contains actual content
          if (chunkResult.content) {
            // Create content streaming event with only the incremental content
            const messageEvent = this.eventStream.createEvent(
              EventType.ASSISTANT_STREAMING_MESSAGE,
              {
                content: chunkResult.content, // Only send the incremental content, not accumulated
                isComplete: Boolean(processingState.finishReason),
                messageId: messageId, // Add the message ID to correlate with final message
              },
            );
            this.eventStream.sendEvent(messageEvent);
          }

          // Tool call updates are handled separately and will be sent in the final assistant message
          // We don't send partial tool calls in streaming events
        }
      }

      // Check if operation was aborted after processing chunks
      if (abortSignal?.aborted) {
        this.logger.info(`[LLM] Streaming response processing aborted after chunks`);
        return;
      }

      // Finalize the stream processing
      const parsedResponse = toolCallEngine.finalizeStreamProcessing(processingState);

      this.logger.infoWithData('Finalized Response', parsedResponse, JSON.stringify);

      // Create the final events based on processed content
      this.createFinalEvents(
        parsedResponse.content || '',
        parsedResponse.toolCalls || [],
        parsedResponse.reasoningContent || '',
        parsedResponse.finishReason || 'stop',
        messageId, // Pass the message ID to final events
      );

      // Call response hooks with session ID
      this.agent.onLLMResponse(sessionId, {
        provider: resolvedModel.provider,
        response: {
          id: allChunks[0]?.id || '',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: parsedResponse.content || '',
                tool_calls: parsedResponse.toolCalls,
                refusal: null,
              },
              finish_reason: parsedResponse.finishReason || 'stop',
            },
          ],
          created: Date.now(),
          model: resolvedModel.model,
          object: 'chat.completion',
        } as ChatCompletion,
      });

      this.agent.onLLMStreamingResponse(sessionId, {
        provider: resolvedModel.provider,
        chunks: allChunks,
      });

      this.logger.info(
        `[LLM] Streaming response completed from ${resolvedModel.provider} | SessionId: ${sessionId}`,
      );

      // Process any tool calls
      if (
        parsedResponse.toolCalls &&
        parsedResponse.toolCalls.length > 0 &&
        !abortSignal?.aborted
      ) {
        const toolNames = parsedResponse.toolCalls.map((tc) => tc.function?.name).join(', ');
        this.logger.info(
          `[Tools] LLM requested ${parsedResponse.toolCalls.length} tool executions: ${toolNames}`,
        );

        // Process each tool call
        await this.toolProcessor.processToolCalls(parsedResponse.toolCalls, sessionId, abortSignal);
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
