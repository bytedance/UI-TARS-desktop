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
  AgentEventStream,
  Tool,
  isAgentRunObjectOptions,
  isStreamingOptions,
  AgentContextAwarenessOptions,
  AgentRunObjectOptions,
  SummaryRequest,
  SummaryResponse,
  ChatCompletionMessageParam,
  IAgent,
  ChatCompletionCreateParams,
  ChatCompletion,
} from '@tarko/agent-interface';

import { BaseAgent } from './base-agent';
import { AgentRunner } from './agent-runner';
import { AgentEventStreamProcessor } from './event-stream';
import { ToolManager } from './tool-manager';
import {
  ModelResolver,
  ResolvedModel,
  OpenAI,
  RequestOptions,
  ChatCompletionChunk,
} from '@tarko/model-provider';
import { getLogger, LogLevel, rootLogger } from '@tarko/shared-utils';
import { AgentExecutionController } from './execution-controller';
import { getLLMClient } from './llm-client';
import { getToolCallEngineForProvider } from '../tool-call-engine/engine-selector';
import { filterTools } from '../utils/tool-filter';

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
export class Agent<T extends AgentOptions = AgentOptions>
  extends BaseAgent<T>
  implements IAgent<T>
{
  static label = '@tarko/agent';
  private instructions: string;
  private maxIterations: number;
  private maxTokens: number | undefined;
  protected name: string;
  protected id: string;
  protected eventStream: AgentEventStreamProcessor;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private temperature: number;
  private top_p?: number;
  private reasoningOptions: LLMReasoningOptions;
  public readonly runner: AgentRunner;
  public logger = getLogger('Core');
  protected executionController: AgentExecutionController;
  private customLLMClient?: OpenAI;
  public initialized = false;
  public isReplaySnapshot = false;
  private currentResolvedModel?: ResolvedModel;
  private isCustomLLMClientSet = false; // Track if custom client was explicitly set
  private executionStartTime = 0; // Track execution start time

  /**
   * Creates a new Agent instance.
   *
   * @param options - Configuration options for the agent including instructions,
   * tools, model selection, and runtime parameters.
   */
  constructor(options: AgentOptions = {}) {
    super(options as T);

    this.instructions = options.instructions || this.getDefaultPrompt();
    this.maxIterations = options.maxIterations ?? 1000;
    this.maxTokens = options.maxTokens;
    this.name = options.name ?? 'Anonymous';
    this.id = options.id ?? '@tarko/agent';

    // console.log(JSON.stringify(options, null, 2));

    // Set the log level if provided in options
    if (options.logLevel !== undefined) {
      rootLogger.setLevel(options.logLevel);
      this.logger.debug(`Log level set to: ${LogLevel[options.logLevel]}`);
    }

    // Initialize event stream manager
    this.eventStream = new AgentEventStreamProcessor(options.eventStreamOptions);

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
    if (defaultSelection.provider || defaultSelection.id) {
      this.logger.info(
        `[Agent] ${this.name} initialized | Default model provider: ${defaultSelection.provider ?? 'N/A'} | ` +
          `Default model: ${defaultSelection.id ?? 'N/A'} | ` +
          `Tools: ${options.tools?.length || 0} | Max iterations: ${this.maxIterations}`,
      );
    }

    this.temperature = options.temperature ?? 0.7;
    this.top_p = options.top_p;

    if (options.thinking) {
      if (typeof options.thinking !== 'object') {
        throw new Error(
          `Invalid thinking option, expected an object, but got ${JSON.stringify(options.thinking)}`,
        );
      }
      this.reasoningOptions = options.thinking;
    } else {
      this.reasoningOptions = { type: 'disabled' };
    }

    // Initialize the resolved model early if possible
    this.initializeEarlyResolvedModel();

    // Initialize the runner with context options and streaming tool call settings
    this.runner = new AgentRunner({
      instructions: this.instructions,
      maxIterations: this.maxIterations,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      top_p: this.top_p,
      reasoningOptions: this.reasoningOptions,
      toolCallEngine: options.toolCallEngine,
      eventStream: this.eventStream,
      toolManager: this.toolManager,
      agent: this,
      contextAwarenessOptions: contextAwarenessOptions,
      enableStreamingToolCallEvents: options.enableStreamingToolCallEvents ?? false,
      enableMetrics: options.metric?.enable ?? false,
    });

    // Initialize execution controller
    this.executionController = new AgentExecutionController();
  }

  /**
   * Initialize early resolved model if model configuration is available
   * This allows LLM client to be available immediately after instantiation
   */
  private initializeEarlyResolvedModel(): void {
    try {
      // Try to resolve with default selection
      this.currentResolvedModel = this.modelResolver.resolve();

      if (this.currentResolvedModel) {
        this.logger.info(
          `[Agent] Early model resolution successful | Provider: ${this.currentResolvedModel.provider} | Model: ${this.currentResolvedModel.id}`,
        );
      }
    } catch (error) {
      this.logger.debug(`[Agent] Early model resolution failed, will resolve during run: ${error}`);
      // Not a critical error - model will be resolved during run
    }
  }

  /**
   * Custom LLM client for testing or custom implementations
   *
   * @param customLLMClient - OpenAI-compatible llm client
   */
  public setCustomLLMClient(client: OpenAI): void {
    this.customLLMClient = client;
    this.isCustomLLMClientSet = true;
    this.runner.llmProcessor.setCustomLLMClient(client);

    this.logger.info('[Agent] Custom LLM client set, will ignore model parameters in run()');
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
  public registerTool(tool: Tool): void {
    this.toolManager.registerTool(tool);
  }

  /**
   * Returns all registered tools as an array, filtered by tool filter options.
   *
   * @returns Array of all registered tool definitions after applying filters
   */
  public getTools(): Tool[] {
    const allTools = this.toolManager.getTools();
    const toolFilterOptions = this.options.tool;

    return filterTools(allTools, toolFilterOptions);
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
  getEventStream(): AgentEventStreamProcessor {
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
   * Executes the main agent reasoning loop.
   *
   * This method processes the user input, communicates with the LLM,
   * executes tools as requested by the LLM, and continues iterating
   * until a final answer is reached or max iterations are hit.
   *
   * @param input - String input for a basic text message
   * @returns The final response event from the agent (stream is false)
   */
  async run(input: string): Promise<AgentEventStream.AssistantMessageEvent>;

  /**
   * Executes the main agent reasoning loop with additional options.
   *
   * @param options - Object with input and optional configuration
   * @returns The final response event from the agent (when stream is false)
   */
  async run(options: AgentRunNonStreamingOptions): Promise<AgentEventStream.AssistantMessageEvent>;

  /**
   * Executes the main agent reasoning loop with streaming support.
   *
   * @param options - Object with input and streaming enabled
   * @returns An async iterable of streaming events
   */
  async run(options: AgentRunStreamingOptions): Promise<AsyncIterable<AgentEventStream.Event>>;

  /**
   * Implementation of the run method to handle all overload cases
   * @param runOptions - Input options
   */
  async run(
    runOptions: AgentRunOptions,
  ): Promise<
    string | AgentEventStream.AssistantMessageEvent | AsyncIterable<AgentEventStream.Event>
  > {
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
      // Set execution start time for tracking elapsed time
      this.executionStartTime = Date.now();

      // Normalize the options
      const normalizedOptions = isAgentRunObjectOptions(runOptions)
        ? runOptions
        : { input: runOptions };

      // Generate sessionId if not provided
      const sessionId =
        normalizedOptions.sessionId ??
        `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Resolve model before running
      // If custom LLM client is set, ignore model parameters and use existing resolved model
      if (this.isCustomLLMClientSet && this.currentResolvedModel) {
        this.logger.info(
          `[Agent] Using existing resolved model with custom LLM client | Provider: ${this.currentResolvedModel.provider} | Model: ${this.currentResolvedModel.id}`,
        );
      } else {
        // Normal model resolution
        this.currentResolvedModel = this.modelResolver.resolve(
          normalizedOptions.model,
          normalizedOptions.provider,
        );
      }

      // Determine the best tool call engine based on the provider if not explicitly specified
      if (!this.options.toolCallEngine && !normalizedOptions.toolCallEngine) {
        const providerEngine = getToolCallEngineForProvider(this.currentResolvedModel.provider);
        normalizedOptions.toolCallEngine = providerEngine;
        this.logger.info(
          `[Agent] Auto-selected tool call engine "${providerEngine}" for provider "${this.currentResolvedModel.provider}"`,
        );
      }

      // Create and send agent run start event
      const runStartEvent = this.eventStream.createEvent('agent_run_start', {
        sessionId,
        runOptions: this.sanitizeRunOptions(normalizedOptions),
        provider: this.currentResolvedModel.provider,
        model: this.currentResolvedModel.id,
        modelDisplayName: this.currentResolvedModel.displayName,
        agentName: this.name,
      });

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

        // Send events AFTER creating the stream to ensure they are included
        // Add user message to event stream
        const userEvent = this.eventStream.createEvent('user_message', {
          content: normalizedOptions.input,
        });
        this.eventStream.sendEvent(userEvent);

        // Inject environment input if provided in run options
        if (normalizedOptions.environmentInput) {
          const environmentEvent = this.eventStream.createEvent('environment_input', {
            content: normalizedOptions.environmentInput.content,
            description: normalizedOptions.environmentInput.description || 'Environment context',
            metadata: normalizedOptions.environmentInput.metadata,
          });
          this.eventStream.sendEvent(environmentEvent);

          this.logger.info('[Agent] Injected environment input as environment_input event');
        }

        // Send agent run start event
        this.eventStream.sendEvent(runStartEvent);

        // Register a cleanup handler for when execution completes
        this.executionController.registerCleanupHandler(async () => {
          // Send agent run end event regardless of whether it was aborted
          const endEvent = this.eventStream.createEvent('agent_run_end', {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - this.executionStartTime,
            status: this.executionController.getStatus(),
          });
          this.eventStream.sendEvent(endEvent);
        });

        return stream;
      } else {
        // Non-streaming mode: send events before processing

        // Add user message to event stream
        const userEvent = this.eventStream.createEvent('user_message', {
          content: normalizedOptions.input,
        });
        this.eventStream.sendEvent(userEvent);

        // Inject environment input if provided in run options
        if (normalizedOptions.environmentInput) {
          const environmentEvent = this.eventStream.createEvent('environment_input', {
            content: normalizedOptions.environmentInput.content,
            description: normalizedOptions.environmentInput.description || 'Environment context',
            metadata: normalizedOptions.environmentInput.metadata,
          });
          this.eventStream.sendEvent(environmentEvent);

          this.logger.info('[Agent] Injected environment input as environment_input event');
        }

        // Send agent run start event
        this.eventStream.sendEvent(runStartEvent);

        // Execute in non-streaming mode
        try {
          const result = await this.runner.execute(
            normalizedOptions,
            this.currentResolvedModel,
            sessionId,
          );

          // Add agent run end event
          const endEvent = this.eventStream.createEvent('agent_run_end', {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - this.executionStartTime,
            status: AgentStatus.IDLE,
          });
          this.eventStream.sendEvent(endEvent);

          await this.executionController.endExecution(AgentStatus.IDLE);

          // For object input without streaming, return the event
          return result;
        } catch (error) {
          // Send agent run end event with error status
          const endEvent = this.eventStream.createEvent('agent_run_end', {
            sessionId,
            iterations: this.runner.getCurrentIteration(),
            elapsedMs: Date.now() - this.executionStartTime,
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
  private sanitizeRunOptions(options: AgentRunObjectOptions): AgentRunObjectOptions {
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
    // If custom client is set, return it directly
    if (this.customLLMClient) {
      return this.customLLMClient;
    }

    // Try to get from runner if available
    const runnerClient = this.runner?.llmProcessor.getCurrentLLMClient();
    if (runnerClient) {
      return runnerClient;
    }

    // If no client exists yet but we have a resolved model, create one
    if (this.currentResolvedModel) {
      try {
        const newClient = getLLMClient(this.currentResolvedModel, this.reasoningOptions);

        // Set it to the runner so it's available for future calls
        if (this.runner?.llmProcessor) {
          this.runner.llmProcessor.setCustomLLMClient(newClient);
        }

        return newClient;
      } catch (error) {
        this.logger.error(`[Agent] Failed to create LLM client: ${error}`);
      }
    }

    return undefined;
  }

  /**
   * Generate a summary of the provided conversation messages
   * FIXME: using current event stream to generate summary.
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
          model: resolvedModel.id,
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
          model: resolvedModel.id,
          provider: resolvedModel.provider,
        };
      } catch (jsonError) {
        this.logger.warn(`Failed to parse JSON response: ${content}`);
        return {
          summary: 'Untitled Conversation',
          model: resolvedModel.id,
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
   * Override the onAgentLoopEnd from BaseAgent to add execution controller cleanup
   */
  public async onAgentLoopEnd(id: string): Promise<void> {
    // Call parent implementation first
    await super.onAgentLoopEnd(id);

    // End execution if not already ended
    if (this.executionController.isExecuting()) {
      this.executionController.endExecution(AgentStatus.IDLE).catch((err) => {
        this.logger.error(`Error ending execution: ${err}`);
      });
    }
  }

  /**
   * Convenient method to call the current selected LLM
   * This method encapsulates the common pattern of getting the LLM client and resolved model,
   * and provides better error handling when these are not available.
   *
   * @param params - ChatCompletion parameters (model will be automatically set from current resolved model)
   * @param options - Optional request options (e.g., signal for abort)
   * @returns Promise resolving to the LLM response with proper type inference based on stream parameter
   * @throws Error if LLM client or resolved model is not available
   */
  public async callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'> & { stream?: false },
    options?: RequestOptions,
  ): Promise<ChatCompletion>;

  public async callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'> & { stream: true },
    options?: RequestOptions,
  ): Promise<AsyncIterable<ChatCompletionChunk>>;

  public async callLLM(
    params: Omit<ChatCompletionCreateParams, 'model'>,
    options?: RequestOptions,
  ): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>> {
    const llmClient = this.getLLMClient();
    if (!llmClient) {
      throw new Error(
        'LLM client is not available. Make sure the agent is properly initialized and a valid model provider is configured.',
      );
    }

    const resolvedModel = this.getCurrentResolvedModel();
    if (!resolvedModel) {
      throw new Error(
        'Resolved model is not available. Make sure the agent has been run at least once or a valid model configuration is provided.',
      );
    }

    // Merge the resolved model ID with the provided parameters
    const completeParams: ChatCompletionCreateParams = {
      ...params,
      model: resolvedModel.id,
    };

    // Call the LLM with the complete parameters
    const response = await llmClient.chat.completions.create(completeParams, options);
    return response;
  }

  /**
   * Returns all available tools, filtered/modified by onRetrieveTools hook
   *
   * This method provides a way to get the current set of tools that would be
   * available to the agent, after passing through the onRetrieveTools hook.
   *
   * Note: If the onRetrieveTools implementation depends on runtime state that
   * changes during execution, the result of this method may differ from
   * the actual tools used during run().
   *
   * @returns Promise resolving to array of available tool definitions
   */
  public async getAvailableTools(): Promise<Tool[]> {
    const filteredTools = this.getTools(); // This now applies filtering
    try {
      return await this.onRetrieveTools(filteredTools);
    } catch (error) {
      this.logger.error(`[Agent] Error in onRetrieveTools hook: ${error}`);
      return filteredTools;
    }
  }

  /**
   * Override the disposal hook to perform Agent-specific cleanup
   *
   * @returns A promise that resolves when cleanup is complete
   */
  protected async onDispose(): Promise<void> {
    this.logger.info('Starting Agent cleanup process');

    // 1. Abort and end any running execution
    if (this.executionController.isExecuting()) {
      this.logger.info('Aborting running execution during disposal');
      this.executionController.abort();

      try {
        await this.executionController.endExecution(AgentStatus.IDLE);
      } catch (error) {
        this.logger.warn(`Error ending execution during disposal: ${error}`);
      }
    }

    // 2. Clear event stream
    this.eventStream.dispose();
    this.logger.info('Agent cleanup completed successfully');
  }
}
