/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentStatus,
  AgentOptions,
  LLMReasoningOptions,
  AgentRunOptions,
  AgentRunStreamingOptions,
  AgentRunNonStreamingOptions,
  EventStream,
  Event,
  EventType,
  AssistantMessageEvent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ToolDefinition,
  isAgentRunObjectOptions,
  isStreamingOptions,
  ToolCallResult,
  ChatCompletionMessageToolCall,
  AgentContextAwarenessOptions,
  AgentRunObjectOptions,
  SummaryRequest,
  SummaryResponse,
  ChatCompletionMessageParam,
  LoopTerminationCheckResult,
} from '@multimodal/agent-interface';

import { AgentRunner } from './agent-runner';
import { EventStream as EventStreamImpl } from '../stream/event-stream';
import { ToolManager } from './tool-manager';
import { ModelResolver, ResolvedModel, OpenAI } from '@multimodal/model-provider';
import { getLogger, LogLevel, rootLogger } from '../utils/logger';
import { AgentExecutionController } from './execution-controller';

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
  private maxIterations: number;
  private maxTokens: number | undefined;
  protected name: string;
  protected id: string;
  protected eventStream: EventStreamImpl;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private temperature: number;
  private reasoningOptions: LLMReasoningOptions;
  private runner: AgentRunner;
  private currentRunOptions?: AgentRunOptions;
  public logger = getLogger('Core');
  protected executionController: AgentExecutionController;
  private customLLMClient?: OpenAI;
  public initialized = false;
  public isReplaySnapshot = false;
  private currentResolvedModel?: ResolvedModel;
  private shouldTerminateLoop = false;

  /**
   * Creates a new Agent instance.
   *
   * @param options - Configuration options for the agent including instructions,
   * tools, model selection, and runtime parameters.
   */
  constructor(private options: AgentOptions = {}) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.maxIterations = options.maxIterations ?? 10;
    this.maxTokens = options.maxTokens;
    this.name = options.name ?? 'Anonymous';
    this.id = options.id ?? '@multimodal/agent';

    console.log(JSON.stringify(options, null, 2));

    // Set the log level if provided in options
    if (options.logLevel !== undefined) {
      rootLogger.setLevel(options.logLevel);
      this.logger.debug(`Log level set to: ${LogLevel[options.logLevel]}`);
    }

    // Initialize event stream
    this.eventStream = new EventStreamImpl(options.eventStreamOptions);

    // Initialize Tool Manager
    this.toolManager = new ToolManager(this.logger);

    // Ensure context options have default values
    const contextAwarenessOptions: AgentContextAwarenessOptions = options.context ?? {};
    if (contextAwarenessOptions.maxImagesCount === undefined) {
      contextAwarenessOptions.maxImagesCount = 5; // Default to 5 images max
    }

    // Initialize ModelResolver
    this.modelResolver = new ModelResolver(options.model);

    // Register any provided tools
    if (options.tools) {
      options.tools.forEach((tool) => {
        this.registerTool(tool);
      });
    }

    const { providers } = this.options.model ?? {};
    if (Array.isArray(providers)) {
      this.logger.info(`Found ${providers.length} custom model providers`);
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
    // Initialize the runner with context options
    this.runner = new AgentRunner({
      instructions: this.instructions,
      maxIterations: this.maxIterations,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      reasoningOptions: this.reasoningOptions,
      toolCallEngine: options.toolCallEngine,
      eventStream: this.eventStream,
      toolManager: this.toolManager,
      agent: this,
      contextAwarenessOptions: contextAwarenessOptions,
    });

    // Initialize execution controller
    this.executionController = new AgentExecutionController();
  }

  /**
   * Control the initialize process, you may need to perform some time-consuming
   * operations before starting here
   */
  public initialize(): void | Promise<void> {
    this.initialized = true;
  }

  /**
   * Custom LLM client for testing or custom implementations
   *
   * @param customLLMClient - OpenAI-compatible llm client
   */
  public setCustomLLMClient(client: OpenAI): void {
    this.runner.llmProcessor.setCustomLLMClient(client);
  }

  /**
   * Gets the current iteration/loop number of the agent's reasoning process
   * This is useful for tracking progress and debugging
   *
   * @returns The current loop iteration (1-based, 0 if not running)
   */
  public getCurrentLoopIteration(): number {
    return this.runner.getCurrentIteration();
  }

  /**
   * Registers a new tool that the agent can use during execution.
   * Tools are stored in a map keyed by the tool name.
   *
   * @param tool - The tool definition to register
   */
  public registerTool(tool: ToolDefinition): void {
    this.toolManager.registerTool(tool);
  }

  /**
   * Returns all registered tools as an array.
   *
   * @returns Array of all registered tool definitions
   */
  public getTools(): ToolDefinition[] {
    return this.toolManager.getTools();
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
   * @protected
   */
  protected getAgentIdentifier(): string {
    return this.id ? `${this.name} (${this.id})` : this.name;
  }

  /**
   * Request to terminate the agent loop after the current iteration
   * This allows higher-level agents to control when the loop should end,
   * even if there are remaining iterations or tool calls
   *
   * @returns True if the termination request was set, false if already terminating
   */
  public requestLoopTermination(): boolean {
    if (this.shouldTerminateLoop) {
      return false;
    }

    this.logger.info(`[Agent] Loop termination requested by higher-level agent`);
    this.shouldTerminateLoop = true;
    return true;
  }

  /**
   * Check if loop termination has been requested
   * Used internally by the loop executor
   *
   * @returns True if termination has been requested
   * @internal
   */
  public isLoopTerminationRequested(): boolean {
    return this.shouldTerminateLoop;
  }

  /**
   * Reset the termination flag when a new run begins
   * @internal
   */
  private resetLoopTermination(): void {
    this.shouldTerminateLoop = false;
  }

  /**
   * Executes the main agent reasoning loop.
   *
   * This method processes the user input, communicates with the LLM,
   * executes tools as requested by the LLM, and continues iterating
   * until a final answer is reached or max iterations are hit.
   *
   * @param input - String input for a basic text message
   * @returns The final response event from the agent (stream is false)
   */
  async run(input: string): Promise<AssistantMessageEvent>;

  /**
   * Executes the main agent reasoning loop with additional options.
   *
   * @param options - Object with input and optional configuration
   * @returns The final response event from the agent (when stream is false)
   */
  async run(options: AgentRunNonStreamingOptions): Promise<AssistantMessageEvent>;

  /**
   * Executes the main agent reasoning loop with streaming support.
   *
   * @param options - Object with input and streaming enabled
   * @returns An async iterable of streaming events
   */
  async run(options: AgentRunStreamingOptions): Promise<AsyncIterable<Event>>;

  /**
   * Implementation of the run method to handle all overload cases
   * @param runOptions - Input options
   */
  async run(
    runOptions: AgentRunOptions,
  ): Promise<string | AssistantMessageEvent | AsyncIterable<Event>> {
    // Check if agent is already executing
    if (this.executionController.isExecuting()) {
      throw new Error(
        'Agent is already executing a task. Complete or abort the current task before starting a new one.',
      );
    }

    // Reset termination flag for new runs
    this.resetLoopTermination();

    // Begin execution and get abort signal
    const abortSignal = this.executionController.beginExecution();

    if (!this.initialized) await this.initialize();

    try {
      this.currentRunOptions = runOptions;

      // Normalize the options
      const normalizedOptions = isAgentRunObjectOptions(runOptions)
        ? runOptions
        : { input: runOptions };

      // Generate sessionId if not provided
      const sessionId =
        normalizedOptions.sessionId ??
        `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Resolve model before running
      this.currentResolvedModel = this.modelResolver.resolve(
        normalizedOptions.model,
        normalizedOptions.provider,
      );

      // Create and send agent run start event
      const startTime = Date.now();
      const runStartEvent = this.eventStream.createEvent(EventType.AGENT_RUN_START, {
        sessionId,
        runOptions: this.sanitizeRunOptions(normalizedOptions),
        provider: normalizedOptions.provider,
        model: normalizedOptions.model,
      });
      this.eventStream.sendEvent(runStartEvent);

      // Add user message to event stream
      const userEvent = this.eventStream.createEvent(EventType.USER_MESSAGE, {
        content: normalizedOptions.input,
      });

      this.eventStream.sendEvent(userEvent);

      // Inject abort signal into the execution context
      normalizedOptions.abortSignal = abortSignal;

      // Check if streaming is requested
      if (isAgentRunObjectOptions(runOptions) && isStreamingOptions(normalizedOptions)) {
        // Execute in streaming mode - we return the stream directly but also need to handle cleanup
        const stream = this.runner.executeStreaming(
          normalizedOptions,
          this.currentResolvedModel,
          sessionId,
        );

        // Register a cleanup handler for when execution completes
        this.executionController.registerCleanupHandler(async () => {
          if (this.executionController.isAborted()) {
            // Add system event to indicate abort
            const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
              level: 'warning',
              message: 'Agent execution was aborted',
            });
            this.eventStream.sendEvent(systemEvent);
          }

          // Send agent run end event regardless of whether it was aborted
          const endEvent = this.eventStream.createEvent(EventType.AGENT_RUN_END, {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - startTime,
            status: this.executionController.getStatus(),
          });
          this.eventStream.sendEvent(endEvent);
        });

        return stream;
      } else {
        // Execute in non-streaming mode
        try {
          const result = await this.runner.execute(
            normalizedOptions,
            this.currentResolvedModel,
            sessionId,
          );

          // Add agent run end event
          const endEvent = this.eventStream.createEvent(EventType.AGENT_RUN_END, {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - startTime,
            status: AgentStatus.IDLE,
          });
          this.eventStream.sendEvent(endEvent);

          await this.executionController.endExecution(AgentStatus.IDLE);

          // For object input without streaming, return the event
          return result;
        } catch (error) {
          // Send agent run end event with error status
          const endEvent = this.eventStream.createEvent(EventType.AGENT_RUN_END, {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - startTime,
            status: AgentStatus.ERROR,
          });
          this.eventStream.sendEvent(endEvent);

          await this.executionController.endExecution(AgentStatus.ERROR);
          throw error;
        }
      }
    } catch (error) {
      await this.executionController.endExecution(AgentStatus.ERROR);
      throw error;
    }
  }

  /**
   * Sanitize run options to remove sensitive or unnecessary data before including in events
   * @param options The run options to sanitize
   * @returns A safe version of run options for including in events
   * @private
   */
  private sanitizeRunOptions(options: AgentRunObjectOptions): Record<string, any> {
    // Create a copy of the options
    const sanitized = { ...options };

    // Remove sensitive fields
    delete sanitized.abortSignal;

    // If input is complex (like with images), simplify it for the event
    if (Array.isArray(sanitized.input)) {
      sanitized.input = '[Complex multimodal input]';
    }

    return sanitized;
  }

  /**
   * Get the configured LLM client for making direct requests
   *
   * @returns The configured OpenAI-compatible LLM client instance
   */
  public getLLMClient(): OpenAI | undefined {
    return this.customLLMClient || this.runner?.llmProcessor.getCurrentLLMClient();
  }

  /**
   * Generate a summary of the provided conversation messages
   *
   * @param request The summary request containing messages and optional model settings
   * @returns Promise resolving to the summary response
   */
  public async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    // Get LLM client
    const llmClient = this.getLLMClient();
    if (!llmClient) {
      throw new Error('LLM client not available');
    }

    // Use current resolved model if available, otherwise resolve based on request
    const resolvedModel =
      this.currentResolvedModel || this.modelResolver.resolve(request.model, request.provider);

    // Create a system message to instruct the model
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content:
        'Generate a short, concise title (maximum 6 words) that summarizes the main topic of this conversation. Return your response as a JSON object with a single field named "title".',
    };

    // Prepare messages array with system message followed by conversation messages
    const messages: ChatCompletionMessageParam[] = [systemMessage, ...request.messages];

    try {
      // Call the LLM with the prepared messages
      const response = await llmClient.chat.completions.create(
        {
          model: resolvedModel.model,
          messages,
          temperature: 0.3, // Lower temperature for more focused summaries

          max_tokens: 25, // Short responses for titles
          response_format: { type: 'json_object' }, // Enable JSON mode
        },
        {
          // Pass abort signal if provided
          signal: request.abortSignal,
        },
      );

      // Extract summary from response
      const content = response.choices[0]?.message?.content || '{"title": "Untitled Conversation"}';

      try {
        const jsonResponse = JSON.parse(content);
        const summary = jsonResponse.title || 'Untitled Conversation';

        return {
          summary,
          model: resolvedModel.model,
          provider: resolvedModel.provider,
        };
      } catch (jsonError) {
        this.logger.warn(`Failed to parse JSON response: ${content}`);
        return {
          summary: 'Untitled Conversation',
          model: resolvedModel.model,
          provider: resolvedModel.provider,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error}`);
      throw new Error(
        `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the current resolved model configuration
   * This is available after the agent loop has started
   *
   * @returns The current resolved model configuration or undefined if not set
   */
  public getCurrentResolvedModel(): ResolvedModel | undefined {
    return this.currentResolvedModel;
  }

  /**
   * Aborts the currently running agent task if one exists
   * @returns True if an execution was aborted, false otherwise
   */
  public abort(): boolean {
    return this.executionController.abort();
  }

  /**
   * Returns the current execution status of the agent
   */
  public status(): AgentStatus {
    return this.executionController.getStatus();
  }

  /**
   * Hook called before sending a request to the LLM
   * This allows subclasses to inspect the request before it's sent
   *
   * @param id Session identifier for this conversation
   * @param payload The complete request payload
   */
  public onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    // Default implementation: pass-through
  }

  /**
   * Hook called after receiving a response from the LLM
   * This allows subclasses to inspect the response before it's processed
   *
   * @param id Session identifier for this conversation
   * @param payload The complete response payload
   */
  public onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    // Default implementation: pass-through, perf cost: 0.007ms - 0.021ms
  }

  /**
   * Hook called after receiving streaming responses from the LLM
   * Similar to onLLMResponse, but specifically for streaming
   *
   * @param id Session identifier for this conversation
   * @param payload The streaming response payload
   */
  public onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    // Keep it empty.
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   * This method is invoked before each iteration of the agent loop starts,
   * allowing derived classes to perform setup or inject additional context
   *
   * @param sessionId The session identifier for this conversation
   * @returns A promise that resolves when pre-iteration setup is complete
   */
  public onEachAgentLoopStart(sessionId: string): void | Promise<void> {
    // Default implementation does nothing
    // Derived classes can override to insert custom logic
  }

  /**
   * Hook called before a tool is executed
   * This allows subclasses to intercept or modify tool calls before execution
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool being called
   * @param args The arguments for the tool call
   * @returns The possibly modified args for the tool call
   */
  public onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onBeforeToolCall`, { toolCall }, JSON.stringify);
    // Default implementation: pass-through
    return args;
  }

  /**
   * Hook called after a tool is executed
   * This allows subclasses to intercept or modify tool results after execution
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param result The result of the tool call
   * @returns The possibly modified result of the tool call
   */
  public onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onAfterToolCall`, { toolCall, result }, JSON.stringify);
    // Default implementation: pass-through
    return result;
  }

  /**
   * Hook called when a tool execution results in an error
   * This allows subclasses to handle or transform errors from tool calls
   *
   * @param id Session identifier for this conversation
   * @param toolCall Information about the tool that was called
   * @param error The error that occurred
   * @returns A potentially modified error or recovery value
   */
  public onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: any,
  ): Promise<any> | any {
    this.logger.infoWithData(`[Tool] onToolCallError`, { toolCall, error }, JSON.stringify);
    // Default implementation: pass through the error
    return `Error: ${error}`;
  }

  /**
   * Hook called at the end of the agent's execution loop
   * This method is invoked after the agent has completed all iterations or reached a final answer
   *
   * @param id Session identifier for the completed conversation
   */
  public onAgentLoopEnd(id: string): void | Promise<void> {
    // Reset termination flag
    this.shouldTerminateLoop = false;

    // End execution if not already ended
    if (this.executionController.isExecuting()) {
      this.executionController.endExecution(AgentStatus.IDLE).catch((err) => {
        this.logger.error(`Error ending execution: ${err}`);
      });
    }
  }

  /**
   * Hook called before processing a batch of tool calls
   * This allows for intercepting and potentially replacing tool call execution
   * without executing the actual tools - essential for test mocking
   *
   * @param id Session identifier for this conversation
   * @param toolCalls Array of tool calls to be processed
   * @returns Either undefined (to execute tools normally) or an array of tool call results (to skip execution)
   */
  public onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined {
    // Default implementation allows normal tool execution
    return undefined;
  }

  /**
   * Get the custom LLM client if it was provided
   * @returns The custom LLM client or undefined if none was provided
   */
  getCustomLLMClient(): OpenAI | undefined {
    return this.customLLMClient;
  }

  /**
   * Update the internal `isReplaySnapshot` state, used for the Agent Snapshot frmaework.
   */
  public _setIsReplay() {
    this.isReplaySnapshot = true;
  }

  /**
   * Hook called when the agent loop is about to terminate with a final answer
   * This allows subclasses to inspect the final response and decide whether to:
   * 1. Allow termination (return {finished: true})
   * 2. Force continuation (return {finished: false})
   *
   * This hook is crucial for higher-level agents that need to enforce specific
   * completion criteria or ensure certain tools are called before finishing.
   *
   * @param id Session identifier for this conversation
   * @param finalEvent The final assistant message event that would end the loop
   * @returns Decision object indicating whether to finish or continue the loop
   */
  public onBeforeLoopTermination(
    id: string,
    finalEvent: AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> | LoopTerminationCheckResult {
    // Default implementation always allows termination
    return { finished: true };
  }
}
