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
} from '@tarko/agent-interface';
import {
  ResolvedModel,
  LLMReasoningOptions,
  OpenAI,
  ChatCompletionMessageToolCall,
} from '@tarko/model-provider';
import { getLogger } from '@tarko/shared-utils';
import { ToolProcessor } from './tool-processor';
import { StructuredOutputsToolCallEngine } from '../../tool-call-engine';

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
  private enableMetrics: boolean;
  private thinkingStartTimes = new Map<string, number>();

  constructor(
    private agent: Agent,
    private eventStream: AgentEventStream.Processor,
    private toolProcessor: ToolProcessor,
    private reasoningOptions: LLMReasoningOptions,
    private maxTokens?: number,
    private temperature: number = 0.7,
    private top_p?: number,
    private contextAwarenessOptions?: AgentContextAwarenessOptions,
    enableStreamingToolCallEvents = false,
    enableMetrics = false,
  ) {
    this.messageHistory = new MessageHistory(
      this.eventStream,
      this.contextAwarenessOptions?.maxImagesCount,
    );
    this.enableStreamingToolCallEvents = enableStreamingToolCallEvents;
    this.enableMetrics = enableMetrics;
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
      top_p: this.top_p,
    };

    // Process the request
    const startTime = this.enableMetrics ? Date.now() : 0;

    await this.sendRequest(
      resolvedModel,
      prepareRequestContext,
      sessionId,
      toolCallEngine,
      streamingMode,
      startTime,
      abortSignal,
    );

    if (this.enableMetrics) {
      const duration = Date.now() - startTime;
      this.logger.info(`[LLM] Response received | Duration: ${duration}ms`);
    }
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
    requestStartTime: number,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Check if operation was aborted
    if (abortSignal?.aborted) {
      this.logger.info(`[LLM] Request sending aborted`);
      return;
    }

    // Prepare the request using the tool call engine
    const requestOptions = toolCallEngine.prepareRequest(context);

    // Set max tokens limit
    requestOptions.max_tokens = this.maxTokens;
    // Always enable streaming internally for performance
    requestOptions.stream = true;

    // Use either the custom LLM client or create one using model resolver
    this.logger.info(
      `[LLM] Sending streaming request to ${resolvedModel.provider} | ${resolvedModel.id} | SessionId: ${sessionId}`,
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
      requestStartTime,
      abortSignal,
    );
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
    requestStartTime: number,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    // Collect all chunks for final onLLMResponse call
    const allChunks: ChatCompletionChunk[] = [];

    // Initialize stream processing state
    const processingState = toolCallEngine.initStreamProcessingState();

    // Generate a unique message ID to correlate streaming messages with final message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Track TTFT (Time to First Token) only if metrics are enabled
    let firstTokenTime: number | null = null;
    let hasReceivedFirstContent = false;
    let lastReasoningContentLength = 0;
    let reasoningCompleted = false;

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

      // Track first token time only if metrics are enabled
      if (
        this.enableMetrics &&
        !hasReceivedFirstContent /* && (chunkResult.content || chunkResult.reasoningContent) */
      ) {
        firstTokenTime = Date.now();
        hasReceivedFirstContent = true;
        if (requestStartTime > 0) {
          // Only calculate if we have a valid start time
          const ttft = firstTokenTime - requestStartTime;
          this.logger.info(`[LLM] First token received | TTFT: ${ttft}ms`);
        }
      }

      // Only send streaming events in streaming mode
      if (streamingMode) {
        // Send reasoning content if any
        if (chunkResult.reasoningContent) {
          // Track thinking start time for the first reasoning chunk
          if (!this.thinkingStartTimes.has(messageId)) {
            this.thinkingStartTimes.set(messageId, Date.now());
          }

          // Update reasoning content length tracking
          const currentReasoningLength = (processingState.reasoningBuffer || '').length;

          // Create thinking streaming event
          const thinkingEvent = this.eventStream.createEvent(
            'assistant_streaming_thinking_message',
            {
              content: chunkResult.reasoningContent,
              isComplete: Boolean(processingState.finishReason),
              messageId: messageId,
            },
          );
          this.eventStream.sendEvent(thinkingEvent);

          lastReasoningContentLength = currentReasoningLength;
        }

        // Check if reasoning has completed (no new reasoning content in this chunk but we had it before)
        if (
          !chunkResult.reasoningContent &&
          lastReasoningContentLength > 0 &&
          !reasoningCompleted
        ) {
          reasoningCompleted = true;

          // Calculate and send final thinking duration immediately when reasoning ends
          if (this.thinkingStartTimes.has(messageId)) {
            const startTime = this.thinkingStartTimes.get(messageId)!;
            const thinkingDurationMs = Date.now() - startTime;
            this.thinkingStartTimes.delete(messageId);

            // Send final thinking message with duration
            const finalThinkingEvent = this.eventStream.createEvent('assistant_thinking_message', {
              content: processingState.reasoningBuffer || '',
              isComplete: true,
              messageId: messageId,
              thinkingDurationMs: thinkingDurationMs,
            });
            this.eventStream.sendEvent(finalThinkingEvent);
          }
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

    // Check if operation was aborted after processing chunks
    if (abortSignal?.aborted) {
      this.logger.info(`[LLM] Streaming response processing aborted after chunks`);
      return;
    }

    // Finalize the stream processing
    const parsedResponse = toolCallEngine.finalizeStreamProcessing(processingState);

    this.logger.infoWithData('Finalized Response', parsedResponse, JSON.stringify);

    // Calculate timing metrics only if enabled
    let ttftMs: number | undefined;
    let ttltMs: number | undefined;

    if (this.enableMetrics && requestStartTime > 0) {
      ttltMs = Date.now() - requestStartTime;
      ttftMs = firstTokenTime ? firstTokenTime - requestStartTime : ttltMs;
      this.logger.info(`[LLM] Response timing | TTFT: ${ttftMs}ms | Total: ${ttltMs}ms`);
    }

    // Create the final events based on processed content
    this.createFinalEvents(
      parsedResponse.content || '',
      parsedResponse.rawContent ?? '',
      parsedResponse.toolCalls || [],
      parsedResponse.reasoningContent || '',
      parsedResponse.finishReason || 'stop',
      messageId, // Pass the message ID to final events
      ttftMs, // Pass the TTFT only if metrics were calculated
      ttltMs, // Pass the TTLT only if metrics were calculated
      streamingMode, // Pass streaming mode to determine duration calculation
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
        model: resolvedModel.id,
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
    messageId?: string,
    ttftMs?: number,
    ttltMs?: number,
    streamingMode?: boolean,
  ): void {
    // If we have complete content, create a consolidated assistant message event
    if (content || currentToolCalls.length > 0) {
      const assistantEvent = this.eventStream.createEvent('assistant_message', {
        content: content,
        rawContent: rawContent,
        toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
        finishReason: finishReason,
        messageId: messageId, // Include the message ID in the final message
        ttftMs: ttftMs, // Include the TTFT (Time to First Token) for display
        ttltMs: ttltMs, // Include the total response time for analytics
      });

      this.eventStream.sendEvent(assistantEvent);
    }

    // If we have complete reasoning content and NOT in streaming mode, create a consolidated thinking message event
    // (In streaming mode, final thinking event is already sent when reasoning ends)
    if (reasoningBuffer && !streamingMode) {
      const thinkingEvent = this.eventStream.createEvent('assistant_thinking_message', {
        content: reasoningBuffer,
        isComplete: true,
        messageId: messageId,
        // No thinkingDurationMs in non-streaming mode as it's not meaningful
      });

      this.eventStream.sendEvent(thinkingEvent);
    }
  }
}
