/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentOptions,
  AgentReasoningOptions,
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
} from '../types';
import { AgentRunner } from './agent-runner';
import { EventStream as EventStreamImpl } from '../stream/event-stream';
import { ToolManager } from './tool-manager';
import { ModelResolver } from '../utils/model-resolver';
import type { AgentTestAdapter } from './agent-test-adapter';
import { getLogger, LogLevel, rootLogger } from '../utils/logger';

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
  protected id?: string;
  protected eventStream: EventStreamImpl;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private runner: AgentRunner;
  private currentRunOptions?: AgentRunOptions;
  public logger = getLogger('Core');

  /**
   * Agent test adapter for snapshot generation
   * This is only active when running tests
   */
  private testAdapter?: AgentTestAdapter;

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
    this.id = options.id;

    // Set the log level if provided in options
    if (options.logLevel !== undefined) {
      rootLogger.setLevel(options.logLevel);
      this.logger.debug(`Log level set to: ${LogLevel[options.logLevel]}`);
    }

    // Initialize event stream
    this.eventStream = new EventStreamImpl(options.eventStreamOptions);

    // Initialize Tool Manager
    this.toolManager = new ToolManager(this.logger);

    // Initialize ModelResolver
    this.modelResolver = new ModelResolver(options);

    // 仅在测试模式下初始化测试适配器
    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      const { AgentTestAdapter } = require('./agent-test-adapter');
      this.testAdapter = new AgentTestAdapter(this.eventStream, this.logger);
    }

    // Register any provided tools
    if (options.tools) {
      options.tools.forEach((tool) => {
        this.registerTool(tool);
      });
    }

    const { providers } = this.options.model ?? {};
    if (Array.isArray(providers)) {
      this.logger.info(`Found ${providers.length} custom model providers`);
    } else {
      this.logger.warn(`No custom model providers configured, will use built-in providers`);
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

    // Initialize the runner
    this.runner = new AgentRunner({
      instructions: this.instructions,
      maxIterations: this.maxIterations,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      reasoningOptions: this.reasoningOptions,
      toolCallEngine: options.tollCallEngine,
      eventStream: this.eventStream,
      toolManager: this.toolManager,
      modelResolver: this.modelResolver,
      agent: this,
    });
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
   * Executes the main agent reasoning loop.
   *
   * This method processes the user input, communicates with the LLM,
   * executes tools as requested by the LLM, and continues iterating
   * until a final answer is reached or max iterations are hit.
   *
   * @param input - String input for a basic text message
   * @returns The final response from the agent as a string
   */
  async run(input: string): Promise<string>;

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
    this.currentRunOptions = runOptions;

    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      this.testAdapter?.setCurrentRunOptions(runOptions);
    }

    // Normalize the options
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

    // Generate sessionId if not provided
    const sessionId =
      normalizedOptions.sessionId ?? `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Add user message to event stream
    const userEvent = this.eventStream.createEvent(EventType.USER_MESSAGE, {
      content: normalizedOptions.input,
    });

    this.eventStream.sendEvent(userEvent);

    // Check if streaming is requested
    if (isAgentRunObjectOptions(runOptions) && isStreamingOptions(normalizedOptions)) {
      // Execute in streaming mode
      return this.runner.executeStreaming(normalizedOptions, sessionId);
    } else {
      // Execute in non-streaming mode
      const result = await this.runner.execute(normalizedOptions, sessionId);

      // For string input, return the string content
      if (typeof runOptions === 'string') {
        return result.content || '';
      }

      // For object input without streaming, return the event
      return result;
    }
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
  public onLLMRequest(id: string, payload: LLMRequestHookPayload): LLMRequestHookPayload {
    // 仅在测试模式下执行
    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      this.testAdapter?.onLLMRequest(id, payload);
    }

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
  public onLLMResponse(id: string, payload: LLMResponseHookPayload): LLMResponseHookPayload {
    // 仅在测试模式下执行
    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      this.testAdapter?.onLLMResponse(id, payload);
    }

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
  public onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      this.testAdapter?.onLLMStreamingResponse(id, payload);
    }
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
  public onAgentLoopEnd(id: string): void {
    if (process.env.DUMP_AGENT_SNAPSHOP || process.env.TEST_AGENT_SNAPSHOP) {
      this.testAdapter?.onAgentLoopEnd(id);
    }
  }
}
