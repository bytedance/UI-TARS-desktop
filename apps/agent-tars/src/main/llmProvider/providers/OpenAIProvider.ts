import OpenAI from 'openai';
import { Message, ToolCall } from '@agent-infra/shared';
import { ChatCompletionTool } from 'openai/resources';
import { BaseProvider } from './BaseProvider';
import { LLMConfig, LLMResponse, ToolChoice } from '../interfaces/LLMProvider';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig = {}) {
    super(config);

    // Use environment variables or defaults
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    const baseURL = config.baseURL || process.env.OPENAI_API_BASE_URL;

    if (!apiKey) {
      throw new Error(
        'API key is required. Set API_KEY environment variable or provide in config.',
      );
    }

    logger.info('[OpenAIProvider]', maskSensitiveData({ apiKey, baseURL }));
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = config.model || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
  }

  /**
   * Convert Message objects to OpenAI API format
   */
  protected formatMessages(
    messages: Message[],
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((item) => ({
      role: item.role as any,
      content: item.content,
      ...(item.tool_call_id && { tool_call_id: item.tool_call_id }),
      ...(item.tool_calls && {
        tool_calls:
          item.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[],
      }),
      ...(item.name && { name: item.name }),
    }));
  }

  /**
   * Process tool calls from response
   */
  private processToolCalls(
    response: OpenAI.Chat.ChatCompletion,
  ): ToolCall[] | undefined {
    const toolCalls = response.choices
      .filter((choice) => choice.finish_reason === 'tool_calls')
      .map((choice) => choice.message.tool_calls)
      .flat();

    if (!toolCalls || toolCalls.length === 0) return undefined;

    return toolCalls
      .map((toolCall) => {
        if (!toolCall) {
          return undefined;
        }

        return {
          id: toolCall.id,
          type: 'function' as const,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          },
        };
      })
      .filter(Boolean) as ToolCall[];
  }

  /**
   * Send a message to the LLM and get a response
   */
  async askLLMText({
    messages,
    requestId,
  }: {
    messages: Message[];
    requestId: string;
  }): Promise<string> {
    try {
      const formattedMessages = this.formatMessages(messages);
      const controller = new AbortController();
      this.activeRequests.set(requestId, controller);

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: formattedMessages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
        },
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }
      this.cleanupRequest(requestId);
      return response.choices[0].message.content || '';
    } catch (error: unknown) {
      this.cleanupRequest(requestId);
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'))
      ) {
        return '';
      }
      throw new Error(`Failed to get response from OpenAI: ${error}`);
    }
  }

  /**
   * Send a message to the LLM with tools and get a response with potential tool calls
   */
  async askTool({
    messages,
    tools,
    requestId,
    toolChoice = 'auto',
  }: {
    messages: Message[];
    tools: ChatCompletionTool[];
    requestId: string;
    toolChoice?: ToolChoice;
  }): Promise<LLMResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);
      const controller = new AbortController();
      this.activeRequests.set(requestId, controller);

      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: formattedMessages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          tools,
          tool_choice: toolChoice,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
        },
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      const content = response.choices[0].message.content;
      const toolCalls = this.processToolCalls(response);
      return { content, tool_calls: toolCalls };
    } catch (error: unknown) {
      this.cleanupRequest(requestId);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      if (errorName === 'AbortError' || errorMessage.includes('aborted')) {
        return { content: '' };
      }
      throw new Error(
        `Failed to get tool response from OpenAI: ${errorMessage}`,
      );
    }
  }

  /**
   * Send a message to the LLM and get a streaming response
   */
  async *askLLMTextStream({
    messages,
    requestId,
  }: {
    messages: Message[];
    requestId: string;
  }): AsyncGenerator<string> {
    try {
      const formattedMessages = this.formatMessages(messages);
      const controller = new AbortController();
      this.activeRequests.set(requestId, controller);

      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: formattedMessages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: this.config.topP,
          frequency_penalty: this.config.frequencyPenalty,
          presence_penalty: this.config.presencePenalty,
          stream: true,
        },
        {
          signal: controller.signal,
        },
      );

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          throw new Error('Request aborted');
        }
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('aborted'))
      ) {
        throw new Error('Request aborted');
      }
      throw error;
    } finally {
      this.cleanupRequest(requestId);
    }
  }
}
