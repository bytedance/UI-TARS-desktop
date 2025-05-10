/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ToolDefinition,
  ChatCompletionMessageParam,
  AgentOptions,
  ChatCompletionMessageToolCall,
  Model,
} from './types';
import type {
  ProviderResponse,
  ToolCallProvider,
} from './providers/tool-call-provider';
import { OpenAIToolCallProvider } from './providers/openai-provider';

export class Agent {
  private instructions: string;
  private model: Model;
  private tools: Map<string, ToolDefinition>;
  private maxIterations: number;
  private name: string;
  private messageHistory: ChatCompletionMessageParam[] = [];
  private toolCallProvider: ToolCallProvider;

  constructor(private options: AgentOptions) {
    this.instructions = options.instructions || this.getDefaultPrompt();
    this.model = options.model;
    this.tools = new Map();
    this.maxIterations = options.maxIterations ?? 10;
    this.name = options.name ?? 'Anonymous';

    // Use provided toolCallProvider or default to OpenAIToolCallProvider
    this.toolCallProvider =
      options.toolCallProvider ?? new OpenAIToolCallProvider();

    if (options.tools) {
      options.tools.forEach((tool) => {
        console.log(`🔧 Registered tool: ${tool.name} | ${tool.description}`);
        this.registerTool(tool);
      });
    }

    console.log(
      `🤖 ${this.name} initialized | Model: ${this.model.name} | Tools: ${
        options.tools?.length || 0
      } | Max iterations: ${this.maxIterations}`,
    );
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
   * Execute Agent
   */
  async run(input: string): Promise<string> {
    console.log(`\n🚀 ${this.name} execution started | Input: "${input}"`);

    // Initialize message history with enhanced system prompt
    const systemPrompt = this.getSystemPrompt();
    const enhancedSystemPrompt = this.toolCallProvider.preparePrompt(
      systemPrompt,
      Array.from(this.tools.values()),
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
      { role: 'user', content: input },
    ];

    // Save initial messages to history
    this.messageHistory = [...messages];

    let iterations = 0;
    let finalAnswer: string | null = null;

    while (iterations < this.maxIterations && finalAnswer === null) {
      iterations++;
      console.log(`\n📍 Iteration ${iterations}/${this.maxIterations} started`);

      // Call LLM
      console.log(`🧠 Requesting LLM (${this.model.name})...`);

      const messagesText = messages.map((m) => m.content || '').join(' ');
      const estimatedTokens = Math.round(messagesText.length / 4);
      console.log(
        `📝 Messages: ${messages.length} | Estimated tokens: ~${estimatedTokens}`,
      );

      if (this.getTools().length) {
        console.log(
          `🧰 Providing ${this.getTools().length} tools: ${this.getTools()
            .map((t) => t.name)
            .join(', ')}`,
        );
      }

      const startTime = Date.now();
      const response = await this.complete({
        model: this.model,
        messages,
        tools: this.getTools(),
      });
      const duration = Date.now() - startTime;
      console.log(`✅ LLM response received | Duration: ${duration}ms`);

      // Use provider-specific method to format assistant message
      const assistantMessage = this.toolCallProvider.formatAssistantMessage(
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

            console.log(
              `✅ Tool execution completed: ${toolName} | Duration: ${duration}ms`,
            );
            console.log(`✅ Tool execution result: `, result);

            // Add tool result to the results set
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result,
            });
          } catch (error) {
            console.error(
              `❌ Tool execution failed: ${toolName} | Error:`,
              error,
            );
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result: `Error: ${error}`,
            });
          }
        }

        // Use provider-specific method to format tool results message
        const toolResultMessages =
          this.toolCallProvider.formatToolResultsMessage(toolResults);

        // Add to history and current conversation
        this.messageHistory.push(...toolResultMessages);
        messages.push(...toolResultMessages);
      } else {
        // If no tool calls, consider it as the final answer
        finalAnswer = response.content;
        console.log(
          `💬 LLM returned text response (${response.content?.length || 0} characters)`,
        );
        console.log('🏁 Final answer received');
      }

      console.log(`📍 Iteration ${iterations}/${this.maxIterations} completed`);
    }

    if (finalAnswer === null) {
      console.warn(
        `⚠️ Maximum iterations reached (${this.maxIterations}), forcing termination`,
      );
      finalAnswer =
        'Sorry, I could not complete this task. Maximum iterations reached.';

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

  private async complete(options: {
    model: Model;
    messages: ChatCompletionMessageParam[];
    tools?: ToolDefinition[];
    temperature?: number;
    stream?: boolean;
  }): Promise<{
    content: string;
    toolCalls?: ChatCompletionMessageToolCall[];
  }> {
    const { model, messages, tools, temperature = 0.7 } = options;

    try {
      // Prepare the request using the provider
      const requestOptions = this.toolCallProvider.prepareRequest({
        model: model.name,
        messages,
        tools: tools,
        temperature,
      });

      console.log(
        '🔄 Sending request to model with options:',
        JSON.stringify(requestOptions, null, 2),
      );

      // Make the API call
      const response = (await this.model.client.chat.completions.create(
        requestOptions,
      )) as ProviderResponse;

      console.log(
        '✅ Received response from model:',
        JSON.stringify(response, null, 2),
      );

      // Parse the response using the provider
      const parsedResponse =
        await this.toolCallProvider.parseResponse(response);

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
