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
  EventStreamManager,
  ToolCallEvent,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
} from '../types';
import { ChatCompletionMessageParam, JSONSchema7, ChatCompletion } from '../types/third-party';
import { NativeToolCallEngine, PromptEngineeringToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './model';
import { zodToJsonSchema } from '../utils';
import { getLogger } from '../utils/logger';
import { EventStream } from './event-stream';
import { MessageHistory } from './message-history';

/**
 * A minimalist basic Agent Framework.
 */
export class Agent {
  private instructions: string;
  private tools: Map<string, ToolDefinition>;
  private maxIterations: number;
  protected name: string;
  protected id?: string;
  private eventStream: EventStreamManager;
  private toolCallEngine: ToolCallEngine;
  private modelDefaultSelection: ModelDefaultSelection;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  private messageHistory: MessageHistory;
  protected logger = getLogger('Agent');

  constructor(private options: AgentOptions) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.tools = new Map();
    this.maxIterations = options.maxIterations ?? 10;
    this.name = options.name ?? 'Anonymous';
    this.id = options.id;

    // Initialize event stream
    this.eventStream = new EventStream(options.eventStreamOptions);
    this.messageHistory = new MessageHistory(this.eventStream);

    // Use provided ToolCallEngine or default to NativeToolCallEngine
    this.toolCallEngine =
      options?.tollCallEngine === 'PROMPT_ENGINEERING'
        ? new PromptEngineeringToolCallEngine()
        : new NativeToolCallEngine();

    if (options.tools) {
      options.tools.forEach((tool) => {
        this.logger.info(`Registered tool: ${tool.name} | ${tool.description}`);
        this.registerTool(tool);
      });
    }

    const { providers, defaults } = this.options.model;
    if (Array.isArray(providers)) {
      this.logger.info(`Found "${providers.length}" custom model providers.`);
    } else {
      this.logger.info(`No model providers set up, you need to use the built-in model providers.`);
    }

    /**
     * Control default model selection.
     */
    this.modelDefaultSelection = defaults
      ? defaults
      : (function () {
          if (
            Array.isArray(providers) &&
            providers.length >= 1 &&
            Array.isArray(providers[0].models) &&
            providers[0].models.length >= 1
          ) {
            return {
              provider: providers[0].name,
              model: providers[0].models[0].id,
            };
          }
          return {};
        })();

    if (this.modelDefaultSelection) {
      this.logger.info(
        `${this.name} initialized` +
          `| Default Model Provider: ${this.modelDefaultSelection.provider} ` +
          `| Default Model: ${this.modelDefaultSelection.model} ` +
          `| Tools: ${options.tools?.length || 0} | Max iterations: ${this.maxIterations}`,
      );
    }

    this.temperature = options.temperature ?? 0.7;
    this.reasoningOptions = options.thinking ?? { type: 'disabled' };
  }

  /**
   * Get the event stream manager
   */
  getEventStream(): EventStreamManager {
    return this.eventStream;
  }

  /**
   * Get a string identifier for the agent, including ID if available
   * @private
   */
  protected getAgentIdentifier(): string {
    return this.id ? `${this.name} (${this.id})` : this.name;
  }

  /**
   * Entering the agent loop.
   */
  async run(runOptions: AgentRunOptions): Promise<string> {
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

    // Generate sessionId if not provided
    const sessionId =
      normalizedOptions.sessionId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const usingProvider = normalizedOptions.provider ?? this.modelDefaultSelection.provider;
    const usingModel = normalizedOptions.model ?? this.modelDefaultSelection.model;

    if (!usingProvider || !usingModel) {
      throw new Error(
        'Unable to determine what model provider to call, please specify it when Agent.run, ' +
          'or make sure you specify the models configuration when initializing Agent' +
          `Model Provider: ${usingProvider}, Model: ${usingModel}`,
      );
    }

    this.logger.info(
      `${this.name} execution started, using provider: "${usingProvider}", model: "${usingModel}", sessionId: "${sessionId}"`,
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
      this.logger.info(`Iteration ${iterations}/${this.maxIterations} started`);
      this.logger.info(`Requesting model (${usingModel})...`);

      if (this.getTools().length) {
        this.logger.info(
          `Providing ${this.getTools().length} tools: ${this.getTools()
            .map((t) => t.name)
            .join(', ')}`,
        );
      }

      const startTime = Date.now();
      const prepareRequestContext: PrepareRequestContext = {
        model: usingModel,
        messages,
        tools: this.getTools(),
        temperature: this.temperature,
      };

      const response = await this.request(usingProvider, prepareRequestContext, sessionId);
      const duration = Date.now() - startTime;
      this.logger.info(`LLM response received | Duration: ${duration}ms`);

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
        this.logger.info(
          `LLM requested ${response.toolCalls.length} tool calls: ${response.toolCalls
            .map((tc) => tc.function.name)
            .join(', ')}`,
        );

        // Collect results from all tool calls
        const toolCallResults: ToolCallResult[] = [];

        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const tool = this.tools.get(toolName);

          if (!tool) {
            this.logger.error(`Tool not found: ${toolName}`);
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
            this.logger.info(`Executing tool: ${toolName} | Args: ${JSON.stringify(args)}`);

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

            this.logger.info(`Tool execution completed: ${toolName} | Duration: ${toolDuration}ms`);
            this.logger.infoWithData('Tool call original result', result);

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
            this.logger.error(`Tool execution failed: ${toolName} | Error: ${error}`);

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
        this.logger.info(
          `LLM returned text response (${response.content?.length || 0} characters)`,
        );
        this.logger.info('Final answer received');
      }

      this.logger.info(`Iteration ${iterations}/${this.maxIterations} completed`);
    }

    if (finalAnswer === null) {
      this.logger.warn(`Maximum iterations reached (${this.maxIterations}), forcing termination`);
      finalAnswer = 'Sorry, I could not complete this task. Maximum iterations reached.';

      // Add system message event for max iterations
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
      `${this.name} execution completed | Iterations: ${iterations}/${this.maxIterations}`,
    );
    return finalAnswer;
  }

  /**
   * Register tool
   */
  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all registered tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Generate system prompt
   */
  private getSystemPrompt(): string {
    return `${this.instructions}

Current time: ${new Date().toLocaleString()}`;
  }

  /**
   * Default prompt
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
   * Complete a model request, and return multimodal result.
   *
   * @param usingProvider model provider to use.
   * @param context request context.
   * @param sessionId the session identifier for tracking
   * @returns
   */
  private async request(
    usingProvider: string,
    context: PrepareRequestContext,
    sessionId: string,
  ): Promise<AgentSingleLoopReponse> {
    try {
      // Prepare the request using the provider
      const requestOptions = this.toolCallEngine.prepareRequest(context);

      const client = getLLMClient(
        this.options.model.providers,
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

      this.logger.debug('Sending request to model with options:', JSON.stringify(requestOptions));

      const response = (await client.chat.completions.create(
        requestOptions,
      )) as unknown as ChatCompletion;

      this.logger.debug('Received response from model');

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
        this.logger.debug(`Detected ${parsedResponse.toolCalls.length} tool calls in response`);
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
      this.logger.error(`LLM API error: ${error}`);

      // Add system event for LLM API error
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'error',
        message: `LLM API error: ${error}`,
        details: { error: String(error) },
      });
      this.eventStream.addEvent(systemEvent);

      return {
        content: 'Sorry, an error occurred while processing your request.',
      };
    }
  }
}
