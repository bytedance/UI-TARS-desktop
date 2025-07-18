/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent } from '../agent';
import { getLLMClient } from '../llm-client';
import { MessageHistory } from '../message-history';
import {
  AgentEventStream,
  PrepareRequestContext,
  ToolCallEnginePrepareRequestContext,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ToolCallEngine,
  ChatCompletion,
  AgentContextAwarenessOptions,
  Tool,
} from '@multimodal/agent-interface';
import {
  ResolvedModel,
  LLMReasoningOptions,
  OpenAI,
  ChatCompletionMessageToolCall,
  ResponseCreateParams,
} from '@multimodal/model-provider';
import { getLogger } from '../../utils/logger';
import { ToolProcessor } from './tool-processor';
import { StructuredOutputsToolCallEngine } from '../../tool-call-engine';
import { ResponseStreamingReturnType } from '@multimodal/llm-client';
import { truncateInput } from '../../utils';
import { ResponseIdCache } from '../../utils/response-cache';

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
  private enableStreamingToolCallEvents: boolean;
  private responseCache?: ResponseIdCache;

  get useResponsesApi(): boolean {
    return this.agent.getOptions().model?.useResponseApi ?? false;
  }

  constructor(
    private agent: Agent,
    private eventStream: AgentEventStream.Processor,
    private toolProcessor: ToolProcessor,
    private reasoningOptions: LLMReasoningOptions,
    private maxTokens?: number,
    private temperature: number = 0.7,
    private contextAwarenessOptions?: AgentContextAwarenessOptions,
    enableStreamingToolCallEvents = false,
  ) {
    this.messageHistory = new MessageHistory(
      this.eventStream,
      this.contextAwarenessOptions?.maxImagesCount,
    );
    this.enableStreamingToolCallEvents = enableStreamingToolCallEvents;
  }

  /**
   * Custom LLM client for testing or custom implementations
   *
   * @param llmClient - OpenAI-compatible llm client
   */
  public setCustomLLMClient(client: OpenAI): void {
    this.llmClient = client;
    this.responseCache?.setLLMClient(client);
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

    // Log warning if StructuredOutputsToolCallEngine is used with streaming tool call events
    if (
      toolCallEngine instanceof StructuredOutputsToolCallEngine &&
      this.enableStreamingToolCallEvents
    ) {
      this.logger.warn(
        '[LLM] StructuredOutputsToolCallEngine does not support streaming tool call events. ' +
          'Consider using NativeToolCallEngine or PromptEngineeringToolCallEngine for full streaming support.',
      );
    }

    // Create or reuse llm client
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

    // Set the LLM client for the response cache
    if (this.useResponsesApi && !this.responseCache) {
      this.responseCache = new ResponseIdCache(this.llmClient, { maxSize: 5 });
    }

    // Allow the agent to perform any pre-iteration setup
    try {
      await this.agent.onEachAgentLoopStart(sessionId);
      this.logger.debug(`[Agent] Pre-iteration hook executed for iteration ${iteration}`);
    } catch (error) {
      this.logger.error(`[Agent] Error in pre-iteration hook: ${error}`);
    }

    // Get available tools through the legacy hook for backward compatibility
    let tools: Tool[];
    try {
      tools = await this.agent.getAvailableTools();
      if (tools.length) {
        this.logger.info(
          `[Tools] Available: ${tools.length} | Names: ${tools.map((t) => t.name).join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(`[Agent] Error getting available tools: ${error}`);
      tools = [];
    }

    // Call the new onPrepareRequest hook to allow dynamic modification
    let finalSystemPrompt = systemPrompt;
    let finalTools = tools;

    try {
      const prepareRequestContext: PrepareRequestContext = {
        systemPrompt,
        tools,
        sessionId,
        iteration,
      };

      const prepareRequestResult = await this.agent.onPrepareRequest(prepareRequestContext);
      finalSystemPrompt = prepareRequestResult.systemPrompt;
      finalTools = prepareRequestResult.tools;

      this.logger.info(
        `[Request] Prepared with "${finalTools.length}" tools | System prompt length: "${finalSystemPrompt.length}" chars`,
      );

      // Set all final tools as execution context tools
      this.toolProcessor.setExecutionTools(finalTools);
    } catch (error) {
      this.logger.error(`[Agent] Error in onPrepareRequest hook: ${error}`);
      // Fallback to original values on error
      finalSystemPrompt = systemPrompt;
      finalTools = tools;
      // Still set the fallback tools for execution context
      this.toolProcessor.setExecutionTools(finalTools);
    }

    // Build messages for current iteration including enhanced system message
    const messages = this.messageHistory.toMessageHistory(
      toolCallEngine,
      finalSystemPrompt,
      finalTools,
    );

    this.logger.info(`[LLM] Requesting ${resolvedModel.provider}/${resolvedModel.id}`);

    // Prepare request context with final tools
    const prepareRequestContext: ToolCallEnginePrepareRequestContext = {
      model: resolvedModel.id,
      messages,
      tools: finalTools,
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
  }

  /**
   * Send the actual request to the LLM and process the response
   */
  private async sendRequest(
    resolvedModel: ResolvedModel,
    context: ToolCallEnginePrepareRequestContext,
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

    // Check and cleanup cache before new message if it contains images
    await this.responseCache?.checkAndCleanupBeforeNewMessage();

    // Use either the custom LLM client or create one using model resolver
    this.logger.info(
      `[LLM] Sending streaming request to ${resolvedModel.provider} | SessionId: ${sessionId}`,
    );

    let stream;
    // Prepare the request using the tool call engine
    const requestOptions = toolCallEngine.prepareRequest(context, this.useResponsesApi);
    // Always enable streaming internally for performance
    requestOptions.stream = true;

    if (this.useResponsesApi) {
      const body = {
        ...requestOptions,
        max_output_tokens: this.maxTokens,
        previous_response_id:
          this.eventStream.getLatestAssistantResponse()?.responseId || undefined,
      } as ResponseCreateParams;

      this.logger.debug('Response API truncatedInput', {
        input: truncateInput(body.input),
        previous_response_id: body.previous_response_id,
      });

      stream = (await this.llmClient!.responses.create(body, {
        signal: abortSignal,
      })) as ResponseStreamingReturnType;
    } else {
      stream = (await this.llmClient!.chat.completions.create(
        { ...requestOptions, max_tokens: this.maxTokens } as ChatCompletionCreateParams,
        {
          signal: abortSignal,
        },
      )) as AsyncIterable<ChatCompletionChunk>;
    }

    await this.handleStreamingResponse(
      stream,
      resolvedModel,
      requestOptions,
      sessionId,
      toolCallEngine,
      streamingMode,
      abortSignal,
    );
  }

  /**
   * Handle streaming response from LLM
   * Processes chunks, accumulates content, and handles tool calls
   */
  private async handleStreamingResponse(
    stream: AsyncIterable<ChatCompletionChunk> | ResponseStreamingReturnType,
    resolvedModel: ResolvedModel,
    requestOptions: ChatCompletionCreateParams | ResponseCreateParams,
    sessionId: string,
    toolCallEngine: ToolCallEngine,
    streamingMode: boolean,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Collect all chunks for final onLLMResponse call
    const allChunks: (ChatCompletionChunk | OpenAI.Responses.ResponseStreamEvent)[] = [];

    // Initialize stream processing state
    const processingState = toolCallEngine.initStreamProcessingState();

    // Generate a unique message ID to correlate streaming messages with final message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    this.logger.info(`llm stream start`);

    // Process each incoming chunk
    for await (const chunk of stream) {
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        this.logger.info(`[LLM] Streaming response processing aborted`);
        break;
      }

      // this.logger.debug(` llm stream chunk: `, chunk);

      allChunks.push(chunk);

      // Only the return of the response api has the type attribute
      if (('choices' in chunk && chunk.choices) || ('type' in chunk && chunk.type)) {
        // Process the chunk using the tool call engine, use attribute 'choices' to identify completion chat chunk
        const chunkResult =
          'choices' in chunk
            ? toolCallEngine.processStreamingChunk(chunk, processingState)
            : toolCallEngine.processResponseApiStreamingChunk(chunk, processingState);

        // this.logger.debug(`toolCallEngine process chunkResult: `, chunkResult);

        // Only send streaming events in streaming mode
        if (streamingMode) {
          // Send reasoning content if any
          if (chunkResult.reasoningContent) {
            // Create thinking streaming event
            const thinkingEvent = this.eventStream.createEvent(
              'assistant_streaming_thinking_message',
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
            const messageEvent = this.eventStream.createEvent('assistant_streaming_message', {
              content: chunkResult.content, // Only send the incremental content, not accumulated
              isComplete: Boolean(processingState.finishReason),
              messageId: messageId, // Add the message ID to correlate with final message
            });
            this.eventStream.sendEvent(messageEvent);
          }

          // Send streaming tool call updates only if enabled
          if (this.enableStreamingToolCallEvents && chunkResult.streamingToolCallUpdates) {
            for (const toolCallUpdate of chunkResult.streamingToolCallUpdates) {
              const streamingToolCallEvent = this.eventStream.createEvent(
                'assistant_streaming_tool_call',
                {
                  toolCallId: toolCallUpdate.toolCallId,
                  toolName: toolCallUpdate.toolName,
                  arguments: toolCallUpdate.argumentsDelta,
                  isComplete: toolCallUpdate.isComplete,
                  messageId: messageId,
                },
              );
              this.eventStream.sendEvent(streamingToolCallEvent);
            }
          }
        }
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
      parsedResponse.rawContent ?? '',
      parsedResponse.toolCalls || [],
      parsedResponse.reasoningContent || '',
      parsedResponse.finishReason || 'stop',
      parsedResponse.responseId,
      messageId, // Pass the message ID to final events,
    );

    // Add response ID to cache if it exists and contains images
    if (parsedResponse.responseId) {
      this.responseCache?.addResponseId(
        parsedResponse.responseId,
        requestOptions as ResponseCreateParams,
      );
    }

    const chatCompletionChunks = allChunks.filter(
      (c): c is ChatCompletionChunk => 'choices' in c && !!c.choices,
    );

    // Call response hooks with session ID
    this.agent.onLLMResponse(sessionId, {
      provider: resolvedModel.provider,
      response: {
        id: chatCompletionChunks[0]?.id ?? '',
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
        model: resolvedModel.id,
        object: 'chat.completion',
      } as ChatCompletion,
    });

    this.agent.onLLMStreamingResponse(sessionId, {
      provider: resolvedModel.provider,
      chunks: chatCompletionChunks,
    });

    this.logger.info(
      `[LLM] Streaming response completed from ${resolvedModel.provider} | SessionId: ${sessionId}`,
    );

    // Process any tool calls
    if (parsedResponse.toolCalls && parsedResponse.toolCalls.length > 0 && !abortSignal?.aborted) {
      const toolNames = parsedResponse.toolCalls.map((tc) => tc.function?.name).join(', ');
      this.logger.info(
        `[Tools] LLM requested ${parsedResponse.toolCalls.length} tool executions: ${toolNames}`,
      );

      // Process each tool call
      await this.toolProcessor.processToolCalls(parsedResponse.toolCalls, sessionId, abortSignal);
    }
  }

  /**
   * Create the final events from accumulated content
   */
  private createFinalEvents(
    content: string,
    rawContent: string,
    currentToolCalls: ChatCompletionMessageToolCall[],
    reasoningBuffer: string,
    finishReason: string,
    responseId?: string,
    messageId?: string,
  ): void {
    // If we have complete content, create a consolidated assistant message event
    if (content || currentToolCalls.length > 0) {
      const assistantEvent = this.eventStream.createEvent('assistant_message', {
        content: content,
        rawContent: rawContent,
        toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
        finishReason: finishReason,
        messageId: messageId, // Include the message ID in the final message
        responseId: responseId || undefined,
      });

      this.eventStream.sendEvent(assistantEvent);
    }

    // If we have complete reasoning content, create a consolidated thinking message event
    if (reasoningBuffer) {
      const thinkingEvent = this.eventStream.createEvent('assistant_thinking_message', {
        content: reasoningBuffer,
        isComplete: true,
      });

      this.eventStream.sendEvent(thinkingEvent);
    }
  }
}
