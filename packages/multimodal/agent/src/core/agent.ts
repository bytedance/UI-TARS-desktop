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
  ModelResponse,
  ModelDefaultSelection,
  isAgentRunObjectOptions,
  ToolCallResult,
  AgentSingleLoopReponse,
  AgentReasoningOptions,
} from '../types';
import { ChatCompletionMessageParam } from '../types/third-party';
import { NativeToolCallEngine, PromptEngineeringToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './model';
import { convertToMultimodalToolCallResult } from '../utils';
import { getLogger } from '../utils/logger';

/**
 * A minimalist basic Agent Framework.
 */
export class Agent {
  private instructions: string;
  private tools: Map<string, ToolDefinition>;
  private maxIterations: number;
  private name: string;
  private messageHistory: ChatCompletionMessageParam[] = [];
  private ToolCallEngine: ToolCallEngine;
  private modelDefaultSelection: ModelDefaultSelection;
  private temperature: number;
  private reasoningOptions: AgentReasoningOptions;
  protected logger = getLogger('Agent');

  constructor(private options: AgentOptions) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.tools = new Map();
    this.maxIterations = options.maxIterations ?? 10;
    this.name = options.name ?? 'Anonymous';

    // Use provided ToolCallEngine or default to NativeToolCallEngine
    this.ToolCallEngine =
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
   * Entering the agent loop.
   */
  async run(runOptions: AgentRunOptions): Promise<string> {
    const normalizedOptions = isAgentRunObjectOptions(runOptions)
      ? runOptions
      : { input: runOptions };

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
      `${this.name} execution started, using provider: "${usingProvider}", model: "${usingModel}"`,
    );

    /**
     * Build system prompt.
     */
    const systemPrompt = this.getSystemPrompt();

    /**
     * Enhance system prompt by current tool call engine.
     */
    const enhancedSystemPrompt = this.ToolCallEngine.preparePrompt(
      systemPrompt,
      Array.from(this.tools.values()),
    );

    /**
     * Build messages.
     */
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
      { role: 'user', content: normalizedOptions.input },
    ];

    // Save initial messages to history
    // FIXME: Support event stream.
    this.messageHistory = [...messages];

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

      const response = await this.request(usingProvider, prepareRequestContext);
      const duration = Date.now() - startTime;
      this.logger.info(`LLM response received | Duration: ${duration}ms`);

      /**
       * Build assistent message and append to the message history.
       */
      const assistantMessage = this.ToolCallEngine.buildHistoricalAssistantMessage(response);
      this.messageHistory.push(assistantMessage);

      messages.push(assistantMessage);

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
            toolCallResults.push({
              toolCallId: toolCall.id,
              toolName,
              content: `Error: Tool "${toolName}" not found`,
            });
            continue;
          }

          try {
            // Parse arguments
            const args = JSON.parse(toolCall.function.arguments || '{}');
            this.logger.info(`Executing tool: ${toolName} | Args: ${JSON.stringify(args)}`);

            const startTime = Date.now();
            const result = await tool.function(args);
            const duration = Date.now() - startTime;

            this.logger.info(`Tool execution completed: ${toolName} | Duration: ${duration}ms`);
            this.logger.infoWithData('Tool call original result', result);

            // Add tool result to the results set
            toolCallResults.push({
              toolCallId: toolCall.id,
              toolName,
              content: result,
            });
          } catch (error) {
            this.logger.error(`Tool execution failed: ${toolName} | Error: ${error}`);
            toolCallResults.push({
              toolCallId: toolCall.id,
              toolName,
              content: `Error: ${error}`,
            });
          }
        }

        /**
         * Use provider-specific method to format tool results message
         */
        const multimodalToolCallResults = toolCallResults.map((toolCallResult) => {
          return convertToMultimodalToolCallResult(toolCallResult);
        });

        const toolResultMessages =
          this.ToolCallEngine.buildHistoricalToolCallResultMessages(multimodalToolCallResults);

        // Add to history and current conversation
        this.messageHistory.push(...toolResultMessages);
        messages.push(...toolResultMessages);
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

      // Add final forced termination message
      const finalMessage: ChatCompletionMessageParam = {
        role: 'assistant',
        content: finalAnswer,
      };
      this.messageHistory.push(finalMessage);
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
   * Get message history
   */
  getMessageHistory(): ChatCompletionMessageParam[] {
    return [...this.messageHistory];
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
   * Complete a model request, and return multimodal result.
   *
   * @param usingProvider model provider to use.
   * @param context request context.
   * @returns
   */
  private async request(
    usingProvider: string,
    context: PrepareRequestContext,
  ): Promise<AgentSingleLoopReponse> {
    try {
      // Prepare the request using the provider
      const requestOptions = this.ToolCallEngine.prepareRequest(context);

      const client = getLLMClient(
        this.options.model.providers,
        context.model,
        usingProvider,
        this.reasoningOptions,
      );

      this.logger.debug('Sending request to model with options:', JSON.stringify(requestOptions));

      const response = (await client.chat.completions.create(
        requestOptions,
      )) as unknown as ModelResponse;

      this.logger.debug('Received response from model');

      // Parse the response using the provider
      const parsedResponse = await this.ToolCallEngine.parseResponse(response);

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
      return {
        content: 'Sorry, an error occurred while processing your request.',
      };
    }
  }
}
