/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentReasoningOptions,
  AgentRunObjectOptions,
  AgentRunStreamingOptions,
  AssistantMessageEvent,
  Event,
  EventStream,
  EventType,
  PrepareRequestContext,
  ToolCallEngine,
  ToolCallEngineType,
  ToolCallResult,
  ToolDefinition,
} from '../types';
import { ToolManager } from './tool-manager';
import { ModelResolver, ResolvedModel } from '../utils/model-resolver';
import { getLogger } from '../utils/logger';
import { Agent } from './agent';
import {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  JSONSchema7,
} from '../types/third-party';
import { NativeToolCallEngine, PromptEngineeringToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './llm-client';
import { MessageHistory } from './message-history';
import { reconstructCompletion } from '../utils/stream-utils';
import { zodToJsonSchema } from '../utils';

/**
 * Runner configuration options
 */
interface AgentRunnerOptions {
  instructions: string;
  maxIterations: number;
  maxTokens?: number;
  temperature: number;
  reasoningOptions: AgentReasoningOptions;
  toolCallEngine?: ToolCallEngineType;
  eventStream: EventStream;
  toolManager: ToolManager;
  modelResolver: ModelResolver;
  agent: Agent;
}

/**
 * Responsible for executing the Agent's reasoning loop
 */
export class AgentRunner {
  private instructions: string;
  private maxIterations: number;
  private maxTokens?: number;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private toolCallEngine: ToolCallEngine;
  private eventStream: EventStream;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private agent: Agent;
  private messageHistory: MessageHistory;
  private logger = getLogger('AgentRunner');

  constructor(options: AgentRunnerOptions) {
    this.instructions = options.instructions;
    this.maxIterations = options.maxIterations;
    this.maxTokens = options.maxTokens;
    this.temperature = options.temperature;
    this.reasoningOptions = options.reasoningOptions;
    this.eventStream = options.eventStream;
    this.toolManager = options.toolManager;
    this.modelResolver = options.modelResolver;
    this.agent = options.agent;

    // Initialize message history
    this.messageHistory = new MessageHistory(this.eventStream);

    // Initialize the tool call engine
    this.toolCallEngine =
      options.toolCallEngine === 'prompt_engineering'
        ? new PromptEngineeringToolCallEngine()
        : new NativeToolCallEngine();
  }

  /**
   * Executes the agent's reasoning loop in non-streaming mode
   *
   * @param runOptions Options for this execution
   * @param sessionId Unique session identifier
   * @returns Final answer as an AssistantMessageEvent
   */
  async execute(
    runOptions: AgentRunObjectOptions,
    sessionId: string,
  ): Promise<AssistantMessageEvent> {
    // Resolve which model and provider to use
    const resolvedModel = this.modelResolver.resolve(runOptions.model, runOptions.provider);

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.model}" | ` +
        `Mode: non-streaming`,
    );

    try {
      return await this.executeAgentLoop(
        resolvedModel,
        sessionId,
        runOptions.tollCallEngine,
        false, // Non-streaming mode
      );
    } finally {
      this.agent.onAgentLoopEnd(sessionId);
    }
  }

  /**
   * Executes the agent's reasoning loop in streaming mode
   *
   * @param runOptions Options for this execution
   * @param sessionId Unique session identifier
   * @returns AsyncIterable of streaming events
   */
  async executeStreaming(
    runOptions: AgentRunStreamingOptions,
    sessionId: string,
  ): Promise<AsyncIterable<Event>> {
    // Resolve which model and provider to use
    const resolvedModel = this.modelResolver.resolve(runOptions.model, runOptions.provider);

    this.logger.info(
      `[Session] Execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.model}" | ` +
        `Mode: streaming`,
    );

    // Create an event stream controller to expose events as an AsyncIterable
    const controller = new AbortController();
    const { signal } = controller;

    // Create a queue to buffer events
    const queue: Event[] = [];
    let resolveNext: ((value: IteratorResult<Event, any>) => void) | null = null;
    let isComplete = false;

    // Subscribe to all events that should be exposed in streaming mode
    const unsubscribe = this.eventStream.subscribeToTypes(
      [
        EventType.ASSISTANT_STREAMING_MESSAGE,
        EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
        EventType.ASSISTANT_MESSAGE,
        EventType.TOOL_CALL,
        EventType.TOOL_RESULT,
      ],
      (event) => {
        // Skip events if aborted
        if (signal.aborted) return;

        // For final assistant message, mark the stream as complete
        if (event.type === EventType.ASSISTANT_MESSAGE) {
          const assistantEvent = event as AssistantMessageEvent;
          // Only mark as complete if this is a final answer with no tool calls
          // This indicates the end of the entire agent conversation, not just a single loop
          if (!assistantEvent.toolCalls || assistantEvent.toolCalls.length === 0) {
            isComplete = true;
            this.logger.info(`[Stream] Final answer received, marking stream as complete`);
          }
        }

        // Add event to queue
        queue.push(event);

        // If someone is waiting for the next item, resolve their promise
        if (resolveNext) {
          const next = resolveNext;
          resolveNext = null;

          if (queue.length > 0) {
            next({ done: false, value: queue.shift()! });
          } else if (isComplete) {
            next({ done: true, value: undefined });
          }
        }
      },
    );

    // Start the agent loop execution in the background - this will continue running
    // through multiple iterations until a final answer is reached
    const loopPromise = this.executeAgentLoop(
      resolvedModel,
      sessionId,
      runOptions.tollCallEngine,
      true, // Streaming mode
    )
      .then((finalEvent) => {
        // When the loop is completely done (final answer produced)
        this.logger.info(`[Stream] Agent loop execution completed with final answer`);

        // Mark stream as complete if not already done
        if (!isComplete) {
          isComplete = true;

          // If someone is waiting, resolve their promise to complete the iteration
          if (resolveNext) {
            resolveNext({ done: true, value: undefined });
          }
        }

        return finalEvent;
      })
      .catch((error) => {
        // Handle any errors during execution
        this.logger.error(`[Stream] Error in agent loop execution: ${error}`);
        isComplete = true;

        if (resolveNext) {
          resolveNext({ done: true, value: undefined });
        }

        throw error;
      })
      .finally(() => {
        // Clean up when done
        unsubscribe();
        this.agent.onAgentLoopEnd(sessionId);
      });

    // Return an AsyncIterable that yields events as they arrive
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<Event, any>> {
            // If items are in queue, return the next one
            if (queue.length > 0) {
              return { done: false, value: queue.shift()! };
            }

            // If stream is complete and queue is empty, we're done
            if (isComplete) {
              return { done: true, value: undefined };
            }

            // Otherwise wait for the next item
            return new Promise<IteratorResult<Event, any>>((resolve) => {
              resolveNext = resolve;
            });
          },

          async return() {
            // Cancel the execution if consumer stops iterating
            controller.abort();
            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  /**
   * Runs the core agent loop
   * @param resolvedModel The resolved model configuration
   * @param sessionId The unique session ID
   * @param customToolCallEngine Optional custom tool call engine
   * @param streamingMode Whether to operate in streaming mode
   * @returns The final assistant message event
   */
  private async executeAgentLoop(
    resolvedModel: ResolvedModel,
    sessionId: string,
    customToolCallEngine?: ToolCallEngineType,
    streamingMode = false,
  ): Promise<AssistantMessageEvent> {
    let iterations = 0;
    let finalEvent: AssistantMessageEvent | null = null;

    /**
     * Build system prompt and enhance with tool call engine
     */
    const systemPrompt = this.getSystemPrompt();
    const enhancedSystemPrompt = this.toolCallEngine.preparePrompt(
      systemPrompt,
      this.toolManager.getTools(),
    );

    /**
     * Build initial messages
     */
    let messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...this.messageHistory.toMessageHistory(this.toolCallEngine),
    ];

    while (iterations < this.maxIterations && finalEvent === null) {
      iterations++;
      this.logger.info(`[Iteration] ${iterations}/${this.maxIterations} started`);

      if (this.toolManager.getTools().length) {
        this.logger.info(
          `[Tools] Available: ${this.toolManager.getTools().length} | Names: ${this.toolManager
            .getTools()
            .map((t) => t.name)
            .join(', ')}`,
        );
      }

      this.logger.info(`[LLM] Requesting ${resolvedModel.provider}/${resolvedModel.model}`);

      const startTime = Date.now();
      const prepareRequestContext: PrepareRequestContext = {
        model: resolvedModel.model,
        messages,
        tools: this.toolManager.getTools(),
        temperature: this.temperature,
      };

      // Process the LLM request and stream to event stream
      await this.processLLMRequest(
        resolvedModel,
        prepareRequestContext,
        sessionId,
        customToolCallEngine,
        streamingMode,
      );

      const duration = Date.now() - startTime;
      this.logger.info(`[LLM] Response received | Duration: ${duration}ms`);

      // Update messages for next iteration
      messages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...this.messageHistory.toMessageHistory(this.toolCallEngine),
      ];

      // Check if the last event was an assistant message with no tool calls
      // This indicates we've reached the final answer
      const assistantEvents = this.eventStream.getEventsByType([EventType.ASSISTANT_MESSAGE]);
      if (assistantEvents.length > 0) {
        const latestAssistantEvent = assistantEvents[
          assistantEvents.length - 1
        ] as AssistantMessageEvent;
        if (!latestAssistantEvent.toolCalls || latestAssistantEvent.toolCalls.length === 0) {
          finalEvent = latestAssistantEvent;
          const contentLength = latestAssistantEvent.content?.length || 0;
          this.logger.info(`[LLM] Text response received | Length: ${contentLength} characters`);
          this.logger.info(`[Agent] Final answer received`);
        }
      }

      this.logger.info(`[Iteration] ${iterations}/${this.maxIterations} completed`);
    }

    if (finalEvent === null) {
      this.logger.warn(
        `[Agent] Maximum iterations reached (${this.maxIterations}), forcing termination`,
      );
      const errorMsg = 'Sorry, I could not complete this task. Maximum iterations reached.';

      // Add system event for max iterations
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'warning',
        message: `Maximum iterations reached (${this.maxIterations}), forcing termination`,
      });
      this.eventStream.sendEvent(systemEvent);

      // Add final assistant message event
      finalEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: errorMsg,
        finishReason: 'max_iterations',
      });
      this.eventStream.sendEvent(finalEvent);
    }

    this.logger.info(
      `[Session] Execution completed | SessionId: "${sessionId}" | ` +
        `Iterations: ${iterations}/${this.maxIterations}`,
    );

    return finalEvent;
  }

  /**
   * Process an LLM request and handle the response
   * This method centralizes LLM request handling for both streaming and non-streaming modes
   *
   * Note: During testing, the LLM client is mocked by LLMMocker class to return
   * pre-defined responses from test fixtures instead of making real LLM API calls.
   */
  private async processLLMRequest(
    resolvedModel: ResolvedModel,
    context: PrepareRequestContext,
    sessionId: string,
    customToolCallEngine?: ToolCallEngineType,
    streamingMode = false,
  ): Promise<void> {
    try {
      // Use specified tool call engine or default from agent options
      const engineToUse =
        customToolCallEngine === 'prompt_engineering'
          ? new PromptEngineeringToolCallEngine()
          : customToolCallEngine === 'native'
            ? new NativeToolCallEngine()
            : this.toolCallEngine;

      // Prepare the request using the tool call engine
      const requestOptions = engineToUse.prepareRequest(context);

      // Set max tokens limit
      requestOptions.max_tokens = this.maxTokens;
      // Always enable streaming internally for performance
      requestOptions.stream = true;

      const client = getLLMClient(
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
          // but in future versions we would use hookPayload.request instead
          return request;
        },
      );

      this.logger.info(
        `[LLM] Sending streaming request to ${resolvedModel.provider} | SessionId: ${sessionId}`,
      );

      // Make the streaming request
      const stream = (await client.chat.completions.create(
        requestOptions,
      )) as unknown as AsyncIterable<ChatCompletionChunk>;

      // Collect all chunks for final onLLMResponse call
      const allChunks: ChatCompletionChunk[] = [];

      // Buffer variables for consolidating chunks
      let reasoningBuffer = '';
      let contentBuffer = '';
      const currentToolCalls: Partial<ChatCompletionMessageToolCall>[] = [];
      let finishReason: string | null = null;

      try {
        this.logger.info(`llm stream start`);

        // Process each incoming chunk
        for await (const chunk of stream) {
          console.log('<chunk>', chunk);

          allChunks.push(chunk);

          // Extract delta from the chunk
          const delta = chunk.choices[0]?.delta;

          // Extract finish reason if present
          if (chunk.choices[0]?.finish_reason) {
            finishReason = chunk.choices[0].finish_reason;
          }

          // Check for reasoning content
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

          // Check for regular content
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
                },
              );
              this.eventStream.sendEvent(messageEvent);
            }
          }

          // Check for tool calls
          if (delta?.tool_calls) {
            // Process each tool call in the chunk
            for (const toolCallPart of delta.tool_calls) {
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

            if (currentToolCalls.length > 0 && streamingMode) {
              // Create tool call streaming event (only in streaming mode)
              const toolCallEvent = this.eventStream.createEvent(
                EventType.ASSISTANT_STREAMING_MESSAGE,
                {
                  content: '',
                  toolCalls: [...currentToolCalls],
                  isComplete: Boolean(finishReason),
                },
              );
              this.eventStream.sendEvent(toolCallEvent);
            }
          }
        }

        this.logger.info(`llm stream finished`);

        // Reconstruct the complete response object for parsing
        const reconstructedCompletion = reconstructCompletion(allChunks);

        // Use the tool call engine to parse the response
        const parsedResponse = await engineToUse.parseResponse(reconstructedCompletion);

        // If it is the prompt engineering engine, we need to use the parsed toolCalls
        if (parsedResponse.toolCalls && parsedResponse.toolCalls.length > 0) {
          // Update currentToolCalls to the parsed result
          currentToolCalls.length = 0;
          parsedResponse.toolCalls.forEach((toolCall) => currentToolCalls.push(toolCall));
          finishReason = parsedResponse.finishReason || finishReason;
          contentBuffer = parsedResponse.content || contentBuffer;
        }

        // If we have complete content, create a consolidated assistant message event
        if (contentBuffer || currentToolCalls.length > 0) {
          const assistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
            content: contentBuffer,
            toolCalls:
              currentToolCalls.length > 0
                ? (currentToolCalls as ChatCompletionMessageToolCall[])
                : undefined,
            finishReason: finishReason || 'stop',
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

        // Call response hook with session ID and all collected chunks
        this.agent.onLLMResponse(sessionId, {
          provider: resolvedModel.provider,
          response: reconstructedCompletion,
        });

        // FIXME: on-demand trigger.
        this.agent.onLLMStreamingResponse(sessionId, {
          provider: resolvedModel.provider,
          chunks: allChunks,
        });

        this.logger.info(
          `[LLM] Streaming response completed from ${resolvedModel.provider} | SessionId: ${sessionId}`,
        );
      } catch (error) {
        console.log(error);

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

        // Call response hook with error information
        this.agent.onLLMStreamingResponse(sessionId, {
          provider: resolvedModel.provider,
          chunks: allChunks,
        });

        throw error;
      }

      // Process any tool calls
      if (currentToolCalls.length > 0) {
        const toolNames = currentToolCalls.map((tc) => tc.function?.name).join(', ');
        this.logger.info(
          `[Tools] LLM requested ${currentToolCalls.length} tool executions: ${toolNames}`,
        );

        // Process each tool call
        await this.processToolCalls(currentToolCalls as ChatCompletionMessageToolCall[]);
      }
    } catch (error) {
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
   * Process a collection of tool calls
   */
  private async processToolCalls(
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[]> {
    // Collect results from all tool calls
    const toolCallResults: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;

      try {
        // Parse arguments
        const args = JSON.parse(toolCall.function.arguments || '{}');

        // Create tool call event
        const toolCallEvent = this.eventStream.createEvent(EventType.TOOL_CALL, {
          toolCallId: toolCall.id,
          name: toolName,
          arguments: args,
          startTime: Date.now(),
          tool: {
            name: toolName,
            description: this.toolManager.getTool(toolName)?.description || 'Unknown tool',
            schema: this.getToolSchema(this.toolManager.getTool(toolName)),
          },
        });
        this.eventStream.sendEvent(toolCallEvent);

        // Execute the tool
        const { result, executionTime, error } = await this.toolManager.executeTool(
          toolName,
          toolCall.id,
          args,
        );

        // Create tool result event
        const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
          toolCallId: toolCall.id,
          name: toolName,
          content: result,
          elapsedMs: executionTime,
          error,
        });
        this.eventStream.sendEvent(toolResultEvent);

        // Add to results collection
        toolCallResults.push({
          toolCallId: toolCall.id,
          toolName,
          content: result,
        });
      } catch (error) {
        this.logger.error(`[Tool] Error processing tool call: ${toolName} | ${error}`);

        // Create error result event
        const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
          toolCallId: toolCall.id,
          name: toolName,
          content: `Error: ${error}`,
          elapsedMs: 0,
          error: String(error),
        });
        this.eventStream.sendEvent(toolResultEvent);

        toolCallResults.push({
          toolCallId: toolCall.id,
          toolName,
          content: `Error: ${error}`,
        });
      }
    }

    return toolCallResults;
  }

  /**
   * Get JSON schema for a tool
   */
  private getToolSchema(tool?: ToolDefinition): JSONSchema7 {
    if (!tool) return { type: 'object', properties: {} };

    return tool.hasJsonSchema?.() ? (tool.schema as JSONSchema7) : zodToJsonSchema(tool.schema);
  }

  /**
   * Generates the system prompt for the agent.
   * Combines the base instructions with the current time.
   */
  private getSystemPrompt(): string {
    if (process.env.TEST_AGENT_SNAPSHOP || process.env.DUMP_AGENT_SNAPSHOP) {
      return `${this.instructions}

Current time: 5/20/2025, 10:00:00 AM`;
    }

    return `${this.instructions}

Current time: ${new Date().toLocaleString()}`;
  }
}
