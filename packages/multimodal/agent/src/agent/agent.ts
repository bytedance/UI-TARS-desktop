/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentOptions,
  AgentReasoningOptions,
  AgentRunObjectOptions,
  AgentRunOptions,
  EventStream,
  EventType,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ToolDefinition,
  isAgentRunObjectOptions,
} from '../types';
import { AgentRunner } from './runner';
import { EventStream as EventStreamImpl } from '../stream/event-stream';
import { ToolManager } from './tool-manager';
import { ModelResolver } from '../utils/model-resolver';
import { getLogger } from '../utils/logger';

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
  private eventStream: EventStreamImpl;
  private toolManager: ToolManager;
  private modelResolver: ModelResolver;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private runner: AgentRunner;
  protected logger = getLogger('Agent');

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

    // Initialize event stream
    this.eventStream = new EventStreamImpl(options.eventStreamOptions);

    // Initialize Tool Manager
    this.toolManager = new ToolManager(this.logger);

    // Initialize ModelResolver
    this.modelResolver = new ModelResolver(options);

    // Register any provided tools
    if (options.tools) {
      options.tools.forEach((tool) => {
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
   * @param runOptions - Input options (string or object with additional configuration)
   * @returns Final response string from the agent
   */
  async run(runOptions: AgentRunOptions): Promise<string> {
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

    return this.runner.execute(normalizedOptions, sessionId);
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
    // Default implementation: do nothing
  }

  /**
   * Hook called at the end of the agent's execution loop
   * This method is invoked after the agent has completed all iterations or reached a final answer
   *
   * @param id Session identifier for the completed conversation
   */
  public onAgentLoopEnd(id: string): void {
    // Default implementation: do nothing
  }
}
