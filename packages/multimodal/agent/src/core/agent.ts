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
} from '../types';
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from '../types/third-party';
import { FCToolCallEngine } from '../tool-call-engine';
import { getLLMClient } from './model';

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

  constructor(private options: AgentOptions) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.tools = new Map();
    this.maxIterations = options.maxIterations ?? 10;
    this.name = options.name ?? 'Anonymous';

    // Use provided ToolCallEngine or default to FCToolCallEngine
    this.ToolCallEngine = options.tollCallEngine ?? new FCToolCallEngine();

    if (options.tools) {
      options.tools.forEach((tool) => {
        console.log(`🔧 Registered tool: ${tool.name} | ${tool.description}`);
        this.registerTool(tool);
      });
    }

    const { providers, defaults } = this.options.model;
    if (Array.isArray(providers)) {
      console.log(`Found "${providers.length}" custom model providers.`);
    } else {
      console.log(`No model providers set up, you need to use the built-in model providers.`);
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
            console.log(`🤖 Using first model provider as default model config.`);
            return {
              provider: providers[0].name,
              model: providers[0].models[0].id,
            };
          }
          return {};
        })();

    if (this.modelDefaultSelection) {
      console.log(
        `🤖 ${this.name} initialized` +
          `| Default Model Provider: ${this.modelDefaultSelection.provider} ` +
          `| Default Model: ${this.modelDefaultSelection.model} ` +
          `| Tools: ${options.tools?.length || 0} | Max iterations: ${this.maxIterations}`,
      );
    }
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

    console.log(
      `\n🚀 ${this.name} execution started, using model: "${usingProvider}", model: "${usingModel}"`,
    );

    const systemPrompt = this.getSystemPrompt();
    const enhancedSystemPrompt = this.ToolCallEngine.preparePrompt(
      systemPrompt,
      Array.from(this.tools.values()),
    );

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
      console.log(`\n📍 Iteration ${iterations}/${this.maxIterations} started`);
      console.log(`🧠 Requesting model (${usingModel})...`);
      const messagesText = messages.map((m) => m.content || '').join(' ');
      const estimatedTokens = Math.round(messagesText.length / 4);
      console.log(`📝 Messages: ${messages.length} | Estimated tokens: ~${estimatedTokens}`);

      if (this.getTools().length) {
        console.log(
          `🧰 Providing ${this.getTools().length} tools: ${this.getTools()
            .map((t) => t.name)
            .join(', ')}`,
        );
      }

      const startTime = Date.now();
      const prepareRequestContext: PrepareRequestContext = {
        model: usingModel,
        messages,
        tools: this.getTools(),
        temperature: 0.7,
      };

      const response = await this.request(usingProvider, prepareRequestContext);
      const duration = Date.now() - startTime;
      console.log(`✅ LLM response received | Duration: ${duration}ms`);

      // Use provider-specific method to format assistant message
      const assistantMessage = this.ToolCallEngine.formatAssistantMessage(
        response.content,
        response.toolCalls,
      );

      // Add to history and current conversation
      this.messageHistory.push(assistantMessage);
      messages.push(assistantMessage);

      // Handle tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(
          `🔧 LLM requested ${response.toolCalls.length} tool calls: ${response.toolCalls
            .map((tc) => tc.function.name)
            .join(', ')}`,
        );

        // Collect results from all tool calls
        const toolResults = [];

        for (const toolCall of response.toolCalls) {
          const toolName = toolCall.function.name;
          const tool = this.tools.get(toolName);

          if (!tool) {
            console.error(`❌ Tool not found: ${toolName}`);
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result: `Error: Tool "${toolName}" not found`,
            });
            continue;
          }

          try {
            // Parse arguments
            const args = JSON.parse(toolCall.function.arguments || '{}');
            console.log(`⚙️  Executing tool: ${toolName} | Args:`, args);

            const startTime = Date.now();
            const result = await tool.function(args);
            const duration = Date.now() - startTime;

            console.log(`✅ Tool execution completed: ${toolName} | Duration: ${duration}ms`);
            console.log(`✅ Tool execution result: `, result);

            // Add tool result to the results set
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result,
            });
          } catch (error) {
            console.error(`❌ Tool execution failed: ${toolName} | Error:`, error);
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result: `Error: ${error}`,
            });
          }
        }

        // Use provider-specific method to format tool results message
        const toolResultMessages = this.ToolCallEngine.formatToolResultsMessage(toolResults);

        // Add to history and current conversation
        this.messageHistory.push(...toolResultMessages);
        messages.push(...toolResultMessages);
      } else {
        // If no tool calls, consider it as the final answer
        finalAnswer = response.content;
        console.log(`💬 LLM returned text response (${response.content?.length || 0} characters)`);
        console.log('🏁 Final answer received');
      }

      console.log(`📍 Iteration ${iterations}/${this.maxIterations} completed`);
    }

    if (finalAnswer === null) {
      console.warn(`⚠️ Maximum iterations reached (${this.maxIterations}), forcing termination`);
      finalAnswer = 'Sorry, I could not complete this task. Maximum iterations reached.';

      // Add final forced termination message
      const finalMessage: ChatCompletionMessageParam = {
        role: 'assistant',
        content: finalAnswer,
      };
      this.messageHistory.push(finalMessage);
    }

    console.log(
      `\n🏆 ${this.name} execution completed | Iterations: ${iterations}/${this.maxIterations}`,
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
   * Complete a model request.
   *
   * @param usingProvider model provider to use.
   * @param context request context.
   * @returns
   */
  private async request(
    usingProvider: string,
    context: PrepareRequestContext,
  ): Promise<{
    content: string;
    toolCalls?: ChatCompletionMessageToolCall[];
  }> {
    try {
      // Prepare the request using the provider
      const requestOptions = this.ToolCallEngine.prepareRequest(context);

      const client = getLLMClient(this.options.model.providers, context.model, usingProvider);

      console.log(
        '🔄 Sending request to model with options:',
        JSON.stringify(requestOptions, null, 2),
      );

      const response = (await client.chat.completions.create(
        requestOptions,
      )) as unknown as ModelResponse;

      console.log('✅ Received response from model:', JSON.stringify(response, null, 2));

      // Parse the response using the provider
      const parsedResponse = await this.ToolCallEngine.parseResponse(response);

      // If there are tool calls and finish reason is "tool_calls", return them
      if (
        parsedResponse.toolCalls &&
        parsedResponse.toolCalls.length > 0 &&
        parsedResponse.finishReason === 'tool_calls'
      ) {
        console.log(
          '🔧 Detected tool calls in response:',
          JSON.stringify(parsedResponse.toolCalls, null, 2),
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
      console.error('❌ LLM API error:', error);
      return {
        content: 'Sorry, an error occurred while processing your request.',
      };
    }
  }
}
