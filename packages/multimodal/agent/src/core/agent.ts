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
  ModelDefaultSelection,
  isAgentRunObjectOptions,
  ToolCallResult,
  AgentSingleLoopReponse,
  AgentReasoningOptions,
  EventType,
  EventStream,
  ToolCallEvent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  ModelProviderName,
} from '../types';
import { ChatCompletionMessageParam, JSONSchema7, ChatCompletion } from '../types/third-party';
import { NativeToolCallEngine, PromptEngineeringToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './model';
import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { AgentEventStream } from './event-stream';
import { MessageHistory } from './message-history';

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
  private modelDefaultSelection: ModelDefaultSelection;
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
      options?.tollCallEngine === 'PROMPT_ENGINEERING'
        ? new PromptEngineeringToolCallEngine()
        : new NativeToolCallEngine();

    if (options.tools) {
      options.tools.forEach((tool) => {
        this.logger.info(`[Tool] Registered: ${tool.name} | Description: "${tool.description}"`);
        this.registerTool(tool);
      });
    }

    const { providers, use } = this.options.model ?? {};
    if (Array.isArray(providers)) {
      this.logger.info(`[Models] Found ${providers.length} custom model providers`);
    } else {
      this.logger.warn(`[Models] No custom providers configured, will use built-in providers`);
    }

    /**
     * Control default model selection.
     */
    this.modelDefaultSelection = use
      ? use
      : (function () {
          if (
            Array.isArray(providers) &&
            providers.length >= 1 &&
            Array.isArray(providers[0].models) &&
            providers[0].models.length >= 1
          ) {
            return {
              provider: providers[0].name,
              model: providers[0].models[0],
            };
          }
          return {};
        })();

    if (this.modelDefaultSelection) {
      this.logger.info(
        `[Agent] ${this.name} initialized | Provider: ${this.modelDefaultSelection.provider || 'N/A'} | ` +
          `Model: ${this.modelDefaultSelection.model || 'N/A'} | ` +
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
   * @param runOptions - Either a string input or an object with input and optional configuration
   * @returns The final response from the agent
   */
  async run(runOptions: AgentRunOptions): Promise<string> {
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

    // Generate sessionId if not provided
    const sessionId =
      normalizedOptions.sessionId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // If user does not config model providers, defaults to openai
    let usingProvider = normalizedOptions.provider ?? this.modelDefaultSelection.provider;
    let usingModel = normalizedOptions.model ?? this.modelDefaultSelection.model;

    if (!usingProvider) {
      usingProvider = 'openai';
      if (!usingModel) {
        usingModel = 'gpt-4o';
      }
      this.logger.warn(
        `[Config] Missing model provider configuration. ` +
          `Please specify when calling Agent.run or in Agent initialization. ` +
          `Using default provider "${usingProvider}"`,
      );
    }

    if (!usingModel) {
      throw new Error(
        `[Config] Missing model provider configuration. ` +
          `Please specify when calling Agent.run or in Agent initialization. `,
      );
    }

    this.logger.info(
      `[Session] ${this.name} execution started | SessionId: "${sessionId}" | ` +
        `Provider: "${usingProvider ?? 'N/A'}" | Model: "${usingModel}"`,
    );

    /**
     * Add user message to event stream
     */
    const userEvent = this.eventStream.createEvent(EventType.USER_MESSAGE, {
      content: normalizedOptions.input,
    });

    this.eventStream.addEvent(userEvent);

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

      this.logger.info(`[LLM] Requesting ${usingProvider}/${usingModel}`);

      const startTime = Date.now();
      const prepareRequestContext: PrepareRequestContext = {
        model: usingModel,
        messages,
        tools: this.getTools(),
        temperature: this.temperature,
      };

      const response = await this.request(usingProvider, prepareRequestContext, sessionId);
      const duration = Date.now() - startTime;
      this.logger.info(`[LLM] Response received | Duration: ${duration}ms`);

      /**
       * Build assistant message event and add to event stream
       */
      const assistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: response.content || '',
        toolCalls: response.toolCalls,
        finishReason: response.toolCalls?.length ? 'tool_calls' : 'stop',
        elapsedMs: duration,
      });

      this.eventStream.addEvent(assistantEvent);

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
            this.eventStream.addEvent(toolResultEvent);

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
            this.eventStream.addEvent(toolCallEvent);

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
            this.eventStream.addEvent(toolResultEvent);

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
            this.eventStream.addEvent(toolResultEvent);

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
      this.eventStream.addEvent(systemEvent);

      // Add final assistant message event
      const finalAssistantEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: finalAnswer,
        finishReason: 'max_iterations',
      });
      this.eventStream.addEvent(finalAssistantEvent);
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
   * Complete a model request, and return multimodal result.
   *
   * @param usingProvider model provider to use.
   * @param context request context.
   * @param sessionId the session identifier for tracking
   * @returns
   */
  private async request(
    usingProvider: ModelProviderName,
    context: PrepareRequestContext,
    sessionId: string,
  ): Promise<AgentSingleLoopReponse> {
    try {
      // Prepare the request using the provider
      const requestOptions = this.toolCallEngine.prepareRequest(context);

      // Set max tokens limit
      requestOptions.max_tokens = this.maxTokens;

      const client = getLLMClient(
        this.options.model?.providers,
        context.model,
        usingProvider,
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

      this.logger.debug(`[LLM] Sending request to ${usingProvider} | SessionId: ${sessionId}`);

      const response = (await client.chat.completions.create(
        requestOptions,
      )) as unknown as ChatCompletion;

      this.logger.debug(`[LLM] Response received from ${usingProvider} | SessionId: ${sessionId}`);

      // Call the response hook with session ID
      this.onLLMResponse(sessionId, {
        provider: usingProvider,
        response,
      }).response;

      // Parse the response using the provider
      const parsedResponse = await this.toolCallEngine.parseResponse(response);

      // If there are tool calls and finish reason is "tool_calls", return them
      if (
        parsedResponse.toolCalls &&
        parsedResponse.toolCalls.length > 0 &&
        parsedResponse.finishReason === 'tool_calls'
      ) {
        this.logger.debug(
          `[LLM] Detected ${parsedResponse.toolCalls.length} tool calls in response`,
        );
        return {
          content: parsedResponse.content,
          toolCalls: parsedResponse.toolCalls,
        };
      }

      // Otherwise, return just the content
      return {
        content: parsedResponse.content,
      };
    } catch (error) {
      this.logger.error(`[LLM] API error: ${error} | Provider: ${usingProvider}`);

      // Add system event for LLM API error
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'error',
        message: `LLM API error: ${error}`,
        details: { error: String(error), provider: usingProvider },
      });
      this.eventStream.addEvent(systemEvent);

      return {
        content: 'Sorry, an error occurred while processing your request.',
      };
    }
  }
}
