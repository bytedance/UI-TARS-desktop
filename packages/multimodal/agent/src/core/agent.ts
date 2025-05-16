/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ToolDefinition,
  AgentOptions,
  ToolCallEngine,
  AgentRunOptions,
  PrepareRequestContext,
  isAgentRunObjectOptions,
  ToolCallResult,
  AgentSingleLoopReponse,
  AgentReasoningOptions,
  EventType,
  EventStream,
  ToolCallEvent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ModelProviderName,
  AssistantMessageEvent,
  ToolCallEngineType,
  AgentStreamingResponse,
  AgentRunObjectOptions,
} from '../types';

import {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  JSONSchema7,
  ChatCompletion,
} from '../types/third-party';

import { NativeToolCallEngine, PromptEngineeringToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './model';
import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { AgentEventStream } from './event-stream';
import { MessageHistory } from './message-history';
import { ModelResolver, ResolvedModel } from '../utils/model-resolver';

/**
 * An event-stream driven agent framework for building effective multimodal Agents.
 *
 * - Multi-turn reasoning agent loop
 * - highly customizable, easy to build higher-level Agents
 * - Tool registration and execution
 * - Multimodal context awareness and management
 * - Communication with multiple LLM providers
 * - Event stream management for tracking agent loop state
 */
export class Agent {
  private instructions: string;
  private tools: Map<string, ToolDefinition>;
  private maxIterations: number;
  private maxTokens: number | undefined;
  protected name: string;
  protected id?: string;
  private eventStream: EventStream;
  private toolCallEngine: ToolCallEngine;
  private modelResolver: ModelResolver;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private messageHistory: MessageHistory;
  protected logger = getLogger('Agent');

  /**
   * Creates a new Agent instance.
   *
   * @param options - Configuration options for the agent including instructions,
   * tools, model selection, and runtime parameters.
   */
  constructor(private options: AgentOptions = {}) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.tools = new Map();
    this.maxIterations = options.maxIterations ?? 10;
    this.maxTokens = options.maxTokens;
    this.name = options.name ?? 'Anonymous';
    this.id = options.id;

    // Initialize event stream
    this.eventStream = new AgentEventStream(options.eventStreamOptions);
    this.messageHistory = new MessageHistory(this.eventStream);

    // Use provided ToolCallEngine or default to NativeToolCallEngine
    this.toolCallEngine =
      options?.tollCallEngine === 'prompt_engineering'
        ? new PromptEngineeringToolCallEngine()
        : new NativeToolCallEngine();

    // Initialize ModelResolver
    this.modelResolver = new ModelResolver(options);

    if (options.tools) {
      options.tools.forEach((tool) => {
        this.logger.info(`[Tool] Registered: ${tool.name} | Description: "${tool.description}"`);
        this.registerTool(tool);
      });
    }

    const { providers } = this.options.model ?? {};
    if (Array.isArray(providers)) {
      this.logger.info(`[Models] Found ${providers.length} custom model providers`);
    } else {
      this.logger.warn(`[Models] No custom providers configured, will use built-in providers`);
    }

    // Log the default selection
    const defaultSelection = this.modelResolver.getDefaultSelection();
    if (defaultSelection.provider || defaultSelection.model) {
      this.logger.info(
        `[Agent] ${this.name} initialized | Default model provider: ${defaultSelection.provider ?? 'N/A'} | ` +
          `Default model: ${defaultSelection.model ?? 'N/A'} | ` +
          `Tools: ${options.tools?.length || 0} | Max iterations: ${this.maxIterations}`,
      );
    }

    this.temperature = options.temperature ?? 0.7;
    this.reasoningOptions = options.thinking ?? { type: 'disabled' };
  }

  /**
   * Returns the event stream manager associated with this agent.
   * The event stream tracks all conversation events including messages,
   * tool calls, and system events.
   *
   * @returns The EventStream instance
   */
  getEventStream(): EventStream {
    return this.eventStream;
  }

  /**
   * Returns a string identifier for the agent, including ID if available.
   * Used for logging and identification purposes.
   *
   * @returns A string in format "name (id)" or just "name" if id is not available
   * @private
   */
  protected getAgentIdentifier(): string {
    return this.id ? `${this.name} (${this.id})` : this.name;
  }

  /**
   * Executes the main agent reasoning loop.
   *
   * This method processes the user input, communicates with the LLM,
   * executes tools as requested by the LLM, and continues iterating
   * until a final answer is reached or max iterations are hit.
   *
   * @param runOptions - String input for a basic text message
   * @returns The final response from the agent as a string
   */
  async run(runOptions: string): Promise<string>;

  /**
   * Executes the main agent reasoning loop with additional options.
   *
   * @param runOptions - Object with input and optional configuration
   * @returns The final response from the agent as a string (when stream is false)
   */
  async run(
    runOptions:
      | Omit<AgentRunObjectOptions, 'stream'>
      | (AgentRunObjectOptions & { stream?: false }),
  ): Promise<string>;

  /**
   * Executes the main agent reasoning loop with streaming support.
   *
   * @param runOptions - Object with input and streaming enabled
   * @returns An async iterable of streaming response chunks
   */
  async run(
    runOptions: AgentRunObjectOptions & { stream: true },
  ): Promise<AsyncIterable<AgentStreamingResponse>>;

  /**
   * Implementation of the agent reasoning loop.
   */
  async run(runOptions: AgentRunOptions): Promise<string | AsyncIterable<AgentStreamingResponse>> {
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

    const streamMode = normalizedOptions.stream === true;

    // Generate sessionId if not provided
    const sessionId =
      normalizedOptions.sessionId ?? `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Resolve which model and provider to use
    const resolvedModel = this.modelResolver.resolve(
      normalizedOptions.model,
      normalizedOptions.provider,
    );

    this.logger.info(
      `[Session] ${this.name} execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${resolvedModel.provider}" | Model: "${resolvedModel.model}" | ` +
        `Stream mode: ${streamMode ? 'enabled' : 'disabled'}`,
    );

    /**
     * Add user message to event stream
     */
    const userEvent = this.eventStream.createEvent(EventType.USER_MESSAGE, {
      content: normalizedOptions.input,
    });

    this.eventStream.sendEvent(userEvent);

    /**
     * Build system prompt.
     */
    const systemPrompt = this.getSystemPrompt();

    /**
     * Enhance system prompt by current tool call engine.
     */
    const enhancedSystemPrompt = this.toolCallEngine.preparePrompt(
      systemPrompt,
      Array.from(this.tools.values()),
    );

    /**
     * Build messages using the event stream and tool call engine.
     */
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...this.messageHistory.toMessageHistory(this.toolCallEngine),
    ];

    // If streaming mode is enabled, return an async iterable
    if (streamMode) {
      return this.runStreaming(
        resolvedModel,
        messages,
        sessionId,
        enhancedSystemPrompt,
        normalizedOptions.tollCallEngine,
      );
    }

    // Otherwise, use the standard non-streaming mode
    return this.runNonStreaming(
      resolvedModel,
      messages,
      sessionId,
      enhancedSystemPrompt,
      normalizedOptions.tollCallEngine,
    );
  }

  /**
   * Run agent in streaming mode, returning an async iterable of chunks
   */
  private async runStreaming(
    resolvedModel: ResolvedModel,
    messages: ChatCompletionMessageParam[],
    sessionId: string,
    enhancedSystemPrompt: string,
    customToolCallEngine?: ToolCallEngineType,
  ): Promise<AsyncIterable<AgentStreamingResponse>> {
    // Implementation for streaming mode
    // Return an AsyncIterable that will yield chunks to the caller
    return {
      [Symbol.asyncIterator]: async function* (
        this: Agent,
      ): AsyncGenerator<AgentStreamingResponse, void, unknown> {
        let iterations = 0;
        let finalAnswer: string | null = null;

        while (iterations < this.maxIterations && finalAnswer === null) {
          iterations++;
          this.logger.info(
            `[Iteration] ${iterations}/${this.maxIterations} started (streaming mode)`,
          );

          if (this.getTools().length) {
            this.logger.debug(
              `[Tools] Available: ${this.getTools().length} | Names: ${this.getTools()
                .map((t) => t.name)
                .join(', ')}`,
            );
          }

          // Request context for this iteration
          const prepareRequestContext: PrepareRequestContext = {
            model: resolvedModel.model,
            messages,
            tools: this.getTools(),
            temperature: this.temperature,
          };

          // Start streaming response
          const startTime = Date.now();
          const streamingResponse = await this.requestStreaming(
            resolvedModel,
            prepareRequestContext,
            sessionId,
            customToolCallEngine ?? this.options.tollCallEngine,
          );

          try {
            // Process the streaming response
            for await (const chunk of streamingResponse) {
              // Yield the chunk to the caller
              yield chunk;
            }
          } catch (error) {
            this.logger.error(`[Stream] Error processing stream: ${error}`);

            // Add system event for streaming error
            const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
              level: 'error',
              message: `Streaming error: ${error}`,
              details: { error: String(error) },
            });
            this.eventStream.sendEvent(systemEvent);

            // Exit the stream with an error message
            yield {
              type: 'message',
              content: `Sorry, an error occurred while processing your request: ${error}`,
              isComplete: true,
            };

            return;
          }

          // Update messages for next iteration using consolidated message history
          messages.length = 0; // Clear the array while keeping the reference
          messages.push({ role: 'system', content: enhancedSystemPrompt });
          messages.push(...this.messageHistory.toMessageHistory(this.toolCallEngine));

          // Check if the last event was an assistant message with no tool calls
          // This indicates we've reached the final answer
          const assistantEvents = this.eventStream.getEventsByType([EventType.ASSISTANT_MESSAGE]);
          if (assistantEvents.length > 0) {
            const latestAssistantEvent = assistantEvents[
              assistantEvents.length - 1
            ] as AssistantMessageEvent;
            if (!latestAssistantEvent.toolCalls || latestAssistantEvent.toolCalls.length === 0) {
              finalAnswer = latestAssistantEvent.content;
              this.logger.info(`[Agent] Final answer received (streaming mode)`);
            }
          }

          this.logger.info(
            `[Iteration] ${iterations}/${this.maxIterations} completed (streaming mode)`,
          );
        }

        if (finalAnswer === null) {
          this.logger.warn(
            `[Agent] Maximum iterations reached (${this.maxIterations}), forcing termination`,
          );

          // Yield a final error message
          yield {
            type: 'message',
            content: 'Sorry, I could not complete this task. Maximum iterations reached.',
            isComplete: true,
          };

          // Add system event for max iterations reached
          const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
            level: 'warning',
            message: `Maximum iterations reached (${this.maxIterations}), forcing termination`,
          });
          this.eventStream.sendEvent(systemEvent);

          // Add final assistant message event
          const finalAssistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
            content: 'Sorry, I could not complete this task. Maximum iterations reached.',
            finishReason: 'max_iterations',
          });
          this.eventStream.sendEvent(finalAssistantEvent);
        }

        this.logger.info(
          `[Session] ${this.name} execution completed | SessionId: "${sessionId}" | ` +
            `Iterations: ${iterations}/${this.maxIterations} (streaming mode)`,
        );

        this.onAgentLoopEnd(sessionId);
      }.bind(this),
    };
  }

  /**
   * Run agent in non-streaming mode, returning a final string response
   */
  private async runNonStreaming(
    resolvedModel: ResolvedModel,
    messages: ChatCompletionMessageParam[],
    sessionId: string,
    enhancedSystemPrompt: string,
    customToolCallEngine?: ToolCallEngineType,
  ): Promise<string> {
    let iterations = 0;
    let finalAnswer: string | null = null;

    while (iterations < this.maxIterations && finalAnswer === null) {
      iterations++;
      this.logger.info(`[Iteration] ${iterations}/${this.maxIterations} started`);

      if (this.getTools().length) {
        this.logger.debug(
          `[Tools] Available: ${this.getTools().length} | Names: ${this.getTools()
            .map((t) => t.name)
            .join(', ')}`,
        );
      }

      this.logger.info(`[LLM] Requesting ${resolvedModel.provider}/${resolvedModel.model}`);

      const startTime = Date.now();
      const prepareRequestContext: PrepareRequestContext = {
        model: resolvedModel.model,
        messages,
        tools: this.getTools(),
        temperature: this.temperature,
      };

      // Use the streaming request internally but wait for all chunks to arrive
      const streamingResponse = await this.requestStreaming(
        resolvedModel,
        prepareRequestContext,
        sessionId,
        customToolCallEngine ?? this.options.tollCallEngine,
      );

      // Gather all chunks to create a complete response
      let responseContent = '';
      let responseToolCalls: ChatCompletionMessageToolCall[] | undefined;
      let responseFinishReason: string | undefined;

      try {
        for await (const chunk of streamingResponse) {
          // Collect content from each chunk
          if (chunk.type === 'message') {
            responseContent += chunk.content;
            // Keep latest tool calls
            if (chunk.toolCalls && chunk.isComplete) {
              responseToolCalls = chunk.toolCalls as ChatCompletionMessageToolCall[];
            }
            // Keep finish reason from final chunk
            if (chunk.isComplete) {
              responseFinishReason = chunk.finishReason || undefined;
            }
          }
        }
      } catch (error) {
        this.logger.error(`[Stream] Error collecting chunks: ${error}`);

        // Add system event for streaming error
        const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
          level: 'error',
          message: `Error collecting response chunks: ${error}`,
          details: { error: String(error) },
        });
        this.eventStream.sendEvent(systemEvent);

        return `Sorry, an error occurred while processing your request: ${error}`;
      }

      const duration = Date.now() - startTime;
      this.logger.info(`[LLM] Response received | Duration: ${duration}ms`);

      // Build consolidated response
      const response: AgentSingleLoopReponse = {
        content: responseContent,
        toolCalls: responseToolCalls,
      };

      /**
       * Build assistant message event and add to event stream
       */
      const assistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: response.content || '',
        toolCalls: response.toolCalls,
        finishReason: response.toolCalls?.length ? 'tool_calls' : responseFinishReason || 'stop',
        elapsedMs: duration,
      });

      this.eventStream.sendEvent(assistantEvent);

      // Update messages for next iteration
      messages.length = 0; // Clear the array while keeping the reference
      messages.push({ role: 'system', content: enhancedSystemPrompt });
      messages.push(...this.messageHistory.toMessageHistory(this.toolCallEngine));

      /**
       * Handle tool calls
       */
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolNames = response.toolCalls.map((tc) => tc.function.name).join(', ');
        this.logger.info(
          `[Tools] LLM requested ${response.toolCalls.length} tool executions: ${toolNames}`,
        );

        // Collect results from all tool calls
        const toolCallResults: ToolCallResult[] = [];

        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const tool = this.tools.get(toolName);

          if (!tool) {
            this.logger.error(`[Tool] Not found: "${toolName}"`);
            // Add tool result event with error
            const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
              toolCallId: toolCall.id,
              name: toolName,
              content: `Error: Tool "${toolName}" not found`,
              elapsedMs: 0,
              error: `Tool "${toolName}" not found`,
            });
            this.eventStream.sendEvent(toolResultEvent);

            toolCallResults.push({
              toolCallId: toolCall.id,
              toolName,
              content: `Error: Tool "${toolName}" not found`,
            });
            continue;
          }

          let toolCallEvent: ToolCallEvent;

          try {
            // Parse arguments
            const args = JSON.parse(toolCall.function.arguments || '{}');
            this.logger.info(`[Tool] Executing: "${toolName}" | ToolCallId: ${toolCall.id}`);
            this.logger.debug(`[Tool] Arguments: ${JSON.stringify(args)}`);

            toolCallEvent = this.eventStream.createEvent(EventType.TOOL_CALL, {
              toolCallId: toolCall.id,
              name: toolName,
              arguments: args,
              tool: {
                name: tool.name,
                description: tool.description,
                schema: tool.hasJsonSchema?.()
                  ? (tool.schema as JSONSchema7)
                  : zodToJsonSchema(tool.schema),
              },
              startTime: Date.now(),
            });

            this.eventStream.sendEvent(toolCallEvent);

            const toolStartTime = Date.now();
            const result = await tool.function(args);
            const toolDuration = Date.now() - toolStartTime;

            this.logger.info(
              `[Tool] Execution completed: "${toolName}" | Duration: ${toolDuration}ms | ToolCallId: ${toolCall.id}`,
            );
            this.logger.debug(
              `[Tool] Result: ${typeof result === 'string' ? result : JSON.stringify(result)}`,
            );

            // Add tool result event
            const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
              toolCallId: toolCall.id,
              name: toolName,
              content: result,
              elapsedMs: toolDuration,
            });
            this.eventStream.sendEvent(toolResultEvent);

            // Add tool result to the results set
            toolCallResults.push({
              toolCallId: toolCall.id,
              toolName,
              content: result,
            });
          } catch (error) {
            this.logger.error(
              `[Tool] Execution failed: "${toolName}" | Error: ${error} | ToolCallId: ${toolCall.id}`,
            );

            // Add tool result event with error
            const toolResultEvent = this.eventStream.createEvent(EventType.TOOL_RESULT, {
              toolCallId: toolCall.id,
              name: toolName,
              content: `Error: ${error}`,
              // @ts-expect-error
              elapsedMs: Date.now() - (toolCallEvent?.startTime || Date.now()),
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

        // Update messages after tool executions for the next iteration
        messages.length = 0; // Clear the array while keeping the reference
        messages.push({ role: 'system', content: enhancedSystemPrompt });
        messages.push(...this.messageHistory.toMessageHistory(this.toolCallEngine));
      } else {
        // If no tool calls, consider it as the final answer
        finalAnswer = response.content;
        const contentLength = response.content?.length || 0;
        this.logger.info(`[LLM] Text response received | Length: ${contentLength} characters`);
        this.logger.info(`[Agent] Final answer received`);
      }

      this.logger.info(`[Iteration] ${iterations}/${this.maxIterations} completed`);
    }

    if (finalAnswer === null) {
      this.logger.warn(
        `[Agent] Maximum iterations reached (${this.maxIterations}), forcing termination`,
      );
      finalAnswer = 'Sorry, I could not complete this task. Maximum iterations reached.';

      // Add system event for LLM API error
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'warning',
        message: `Maximum iterations reached (${this.maxIterations}), forcing termination`,
      });
      this.eventStream.sendEvent(systemEvent);

      // Add final assistant message event
      const finalAssistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: finalAnswer,
        finishReason: 'max_iterations',
      });
      this.eventStream.sendEvent(finalAssistantEvent);
    }

    this.logger.info(
      `[Session] ${this.name} execution completed | SessionId: "${sessionId}" | ` +
        `Iterations: ${iterations}/${this.maxIterations}`,
    );

    this.onAgentLoopEnd(sessionId);

    return finalAnswer;
  }

  /**
   * Registers a new tool that the agent can use during execution.
   * Tools are stored in a map keyed by the tool name.
   *
   * @param tool - The tool definition to register
   */
  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Returns all registered tools as an array.
   *
   * @returns Array of all registered tool definitions
   */
  public getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Generates the system prompt for the agent.
   * Combines the base instructions with the current time.
   *
   * @returns The complete system prompt string
   * @private
   */
  private getSystemPrompt(): string {
    return `${this.instructions}

Current time: ${new Date().toLocaleString()}`;
  }

  /**
   * Provides the default instructions used when none are specified.
   * These instructions define the agent's basic behavior and capabilities.
   *
   * @returns The default instructions string
   * @private
   */
  private getDefaultPrompt(): string {
    return `You are an intelligent assistant that can use provided tools to answer user questions.
Please use tools when needed to get information, don't make up answers.
Provide concise and accurate responses.`;
  }

  /**
   * Hook called before sending a request to the LLM
   * This allows subclasses to inspect or modify the request before it's sent
   *
   * Note: Currently only supports inspection; modification of the request
   * will be supported in a future version
   *
   * @param id Session identifier for this conversation
   * @param payload The complete request payload
   * @returns The payload (currently must return the same payload)
   */
  protected onLLMRequest(id: string, payload: LLMRequestHookPayload): LLMRequestHookPayload {
    // Default implementation: pass-through
    return payload;
  }

  /**
   * Hook called after receiving a response from the LLM
   * This allows subclasses to inspect or modify the response before it's processed
   *
   * @param id Session identifier for this conversation
   * @param payload The complete response payload
   * @returns The payload (possibly modified)
   */
  protected onLLMResponse(id: string, payload: LLMResponseHookPayload): LLMResponseHookPayload {
    // Default implementation: pass-through
    return payload;
  }

  /**
   * Hook called after receiving streaming responses from the LLM
   * Similar to onLLMResponse, but specifically for streaming
   *
   * @param id Session identifier for this conversation
   * @param payload The streaming response payload
   */
  protected onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    // Default implementation: do nothing
    // Subclasses can override this method if needed
  }

  /**
   * Hook called at the end of the agent's execution loop
   * This method is invoked after the agent has completed all iterations or reached a final answer
   *
   * Use cases:
   * - Perform cleanup operations after agent execution
   * - Log or analyze the complete conversation history
   * - Send metrics/telemetry about the completed session
   * - Trigger post-processing of results
   * - Notify external systems about completion
   *
   * Subclasses can override this method to implement custom behavior
   * at the end of an agent interaction cycle.
   *
   * @param id Session identifier for the completed conversation
   */
  protected onAgentLoopEnd(id: string): void {
    // Keep it empty.
  }

  /**
   * Request streaming response from LLM
   */
  private async requestStreaming(
    resolvedModel: ResolvedModel,
    context: PrepareRequestContext,
    sessionId: string,
    toolCallEngineType?: ToolCallEngineType,
  ): Promise<AsyncIterable<AgentStreamingResponse>> {
    try {
      // Use specified tool call engine or default from agent options
      const engineToUse =
        toolCallEngineType === 'prompt_engineering'
          ? new PromptEngineeringToolCallEngine()
          : toolCallEngineType === 'native'
            ? new NativeToolCallEngine()
            : this.toolCallEngine;

      // Prepare the request using the tool call engine
      const requestOptions = engineToUse.prepareRequest(context);

      // Set max tokens limit
      requestOptions.max_tokens = this.maxTokens;
      // Always enable streaming
      requestOptions.stream = true;

      const client = getLLMClient(
        resolvedModel,
        this.reasoningOptions,
        // Pass session ID to request interceptor hook
        (provider, request, baseURL) => {
          this.onLLMRequest(sessionId, {
            provider,
            request,
            baseURL,
          });
          // Currently we ignore any modifications to the request
          // but in future versions we would use hookPayload.request instead
          return request;
        },
      );

      this.logger.debug(
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

      return {
        [Symbol.asyncIterator]: async function* (
          this: Agent,
        ): AsyncGenerator<AgentStreamingResponse, void, unknown> {
          try {
            // Process each incoming chunk
            for await (const chunk of stream) {
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

                // Create thinking streaming event
                const thinkingEvent = this.eventStream.createEvent(
                  EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
                  {
                    content: reasoningContent,
                    isComplete: Boolean(finishReason),
                  },
                );

                this.eventStream.sendEvent(thinkingEvent);

                // Yield thinking chunk for streaming consumers
                yield {
                  type: 'thinking',
                  content: reasoningContent,
                  isComplete: Boolean(finishReason),
                } as AgentStreamingResponse;
              }

              // Check for regular content
              if (delta?.content) {
                const content = delta.content;
                contentBuffer += content;

                // Create content streaming event
                const messageEvent = this.eventStream.createEvent(
                  EventType.ASSISTANT_STREAMING_MESSAGE,
                  {
                    content: content,
                    isComplete: Boolean(finishReason),
                  },
                );

                this.eventStream.sendEvent(messageEvent);

                // Yield content chunk for streaming consumers
                yield {
                  type: 'message',
                  content: content,
                  isComplete: Boolean(finishReason),
                  finishReason,
                } as AgentStreamingResponse;
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

                // Create tool call streaming event
                const toolCallEvent = this.eventStream.createEvent(
                  EventType.ASSISTANT_STREAMING_MESSAGE,
                  {
                    content: '',
                    toolCalls: [...currentToolCalls],
                    isComplete: Boolean(finishReason),
                  },
                );

                this.eventStream.sendEvent(toolCallEvent);

                // Yield tool call chunk for streaming consumers
                yield {
                  type: 'message',
                  content: '',
                  toolCalls: [...currentToolCalls],
                  isComplete: Boolean(finishReason),
                  finishReason,
                } as AgentStreamingResponse;
              }
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
              const thinkingEvent = this.eventStream.createEvent(
                EventType.ASSISTANT_THINKING_MESSAGE,
                {
                  content: reasoningBuffer,
                  isComplete: true,
                },
              );

              this.eventStream.sendEvent(thinkingEvent);
            }

            // Call response hook with session ID and all collected chunks
            this.onLLMResponse(sessionId, {
              provider: resolvedModel.provider,
              response: this.reconstructCompletion(allChunks),
            });

            this.logger.debug(
              `[LLM] Streaming response completed from ${resolvedModel.provider} | SessionId: ${sessionId}`,
            );
          } catch (error) {
            this.logger.error(
              `[LLM] Streaming API error: ${error} | Provider: ${resolvedModel.provider}`,
            );

            // Add system event for LLM API error
            const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
              level: 'error',
              message: `LLM Streaming API error: ${error}`,
              details: { error: String(error), provider: resolvedModel.provider },
            });
            this.eventStream.sendEvent(systemEvent);

            // Call response hook with error information
            this.onLLMStreamingResponse(sessionId, {
              provider: resolvedModel.provider,
              chunks: allChunks,
            });

            // Rethrow to be caught by caller
            throw error;
          }
        }.bind(this),
      };
    } catch (error) {
      this.logger.error(
        `[LLM] API error starting stream: ${error} | Provider: ${resolvedModel.provider}`,
      );

      // Add system event for LLM API error
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'error',
        message: `LLM API error starting stream: ${error}`,
        details: { error: String(error), provider: resolvedModel.provider },
      });
      this.eventStream.sendEvent(systemEvent);

      // Return an AsyncIterable that immediately yields an error message and completes
      return {
        [Symbol.asyncIterator]: async function* (): AsyncGenerator<
          AgentStreamingResponse,
          void,
          unknown
        > {
          yield {
            type: 'message',
            content: `Sorry, an error occurred while processing your request: ${error}`,
            isComplete: true,
          } as AgentStreamingResponse;
        },
      };
    }
  }

  /**
   * Reconstruct a ChatCompletion object from an array of chunks
   * This provides a compatible object for the onLLMResponse hook
   */
  private reconstructCompletion(chunks: ChatCompletionChunk[]): ChatCompletion {
    if (chunks.length === 0) {
      // Return minimal valid structure if no chunks
      return {
        id: '',
        choices: [],
        created: Date.now(),
        model: '',
        object: 'chat.completion',
      };
    }

    // Take basic info from the last chunk
    const lastChunk = chunks[chunks.length - 1];

    // Build the content by combining all chunks
    let content = '';
    let reasoningContent = '';
    const toolCalls: ChatCompletionMessageToolCall[] = [];

    // Track tool calls by index
    const toolCallsMap = new Map<number, Partial<ChatCompletionMessageToolCall>>();

    // Process all chunks to reconstruct the complete response
    for (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta;

      // Accumulate content
      if (delta?.content) {
        content += delta.content;
      }

      // Accumulate reasoning content
      // @ts-expect-error Not in OpenAI types
      if (delta?.reasoning_content) {
        // @ts-expect-error
        reasoningContent += delta.reasoning_content;
      }

      // Process tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index;

          // Initialize tool call if needed
          if (!toolCallsMap.has(index)) {
            toolCallsMap.set(index, {
              id: tc.id,
              type: tc.type,
              function: { name: '', arguments: '' },
            });
          }

          // Update existing tool call
          const currentTc = toolCallsMap.get(index)!;

          if (tc.function?.name) {
            currentTc.function!.name = tc.function.name;
          }

          if (tc.function?.arguments) {
            currentTc.function!.arguments =
              (currentTc.function!.arguments || '') + tc.function.arguments;
          }
        }
      }
    }

    // Convert map to array
    toolCallsMap.forEach((tc) => toolCalls.push(tc as ChatCompletionMessageToolCall));

    // Build the reconstructed completion
    return {
      id: lastChunk.id,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
            // @ts-expect-error Not in OpenAI types
            reasoning_content: reasoningContent || undefined,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          },
          finish_reason: lastChunk.choices[0]?.finish_reason || 'stop',
        },
      ],
      created: lastChunk.created,
      model: lastChunk.model,
      object: 'chat.completion',
    };
  }
}
