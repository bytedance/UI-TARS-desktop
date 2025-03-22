import { Message, ToolCall } from '@agent-infra/shared';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
import { Mistral } from '@mistralai/mistralai';
import { BaseProvider } from './BaseProvider';
import { LLMConfig, LLMResponse, ToolChoice } from '../interfaces/LLMProvider';
import { ChatCompletionResponse } from '@mistralai/mistralai/models/components';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

/**
 * Mistral provider implementation
 */
export class MistralProvider extends BaseProvider {
  private client: Mistral;
  private model: string;

  constructor(config: LLMConfig = {}) {
    super(config);

    // Use environment variables or defaults
    const apiKey = config.apiKey || process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Mistral API key is required. Set MISTRAL_API_KEY environment variable or provide in config.',
      );
    }

    // Initialize client with the actual SDK
    this.client = new Mistral({
      apiKey,
    });

    // Set default model or use provided one
    this.model =
      config.model ||
      process.env.MISTRAL_DEFAULT_MODEL ||
      'mistral-large-latest';

    logger.info(
      '[MistralProvider]',
      maskSensitiveData({ apiKey, model: this.model }),
    );
  }

  /**
   * Convert Message objects to Mistral API format
   */
  protected formatMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    })) as ChatCompletionMessageParam[];
  }

  /**
   * Process tool calls from Mistral response
   */
  private processToolCalls(
    response: ChatCompletionResponse,
  ): ToolCall[] | undefined {
    if (!response.choices) {
      return undefined;
    }
    const toolCalls = response.choices[0]?.message?.toolCalls;
    if (!toolCalls || toolCalls.length === 0) {
      return undefined;
    }

    return toolCalls.map((call) => ({
      id: call.id || `mistral-tool-call-${Date.now()}`,
      type: 'function' as const,
      function: {
        name: call.function.name,
        arguments: (call.function.arguments || {}) as any,
      },
    }));
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

      // Use the Mistral SDK to send the request
      const response = await this.client.chat.complete({
        model: this.model,
        messages: formattedMessages as any,
        temperature: this.config.temperature || 0,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
      });

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      const messageContent = response.choices?.[0].message.content || '';
      if (Array.isArray(messageContent)) {
        return messageContent
          .map((c) => (c.type === 'text' ? c.text : ''))
          .join('');
      }
      return messageContent;
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return '';
      }
      throw new Error(`Failed to get response from Mistral: ${error}`);
    }
  }

  /**
   * Send a message to the LLM with tools and get a response with potential tool calls
   */
  async askTool({
    messages,
    tools,
    requestId,
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

      // Convert OpenAI style tools to Mistral format
      const mistralTools = tools.map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.function.name,
          description: tool.function.description || '',
          parameters: tool.function.parameters || ({} as Record<string, any>),
        },
      }));

      // Send the request with tools
      const response = await this.client.chat.complete({
        model: this.model,
        messages: formattedMessages as any,
        temperature: this.config.temperature || 0,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
        tools: mistralTools,
        toolChoice: 'required',
      });

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      const messageContent = response.choices?.[0].message.content || '';
      let content = '';
      if (Array.isArray(messageContent)) {
        content = messageContent
          .map((c) => (c.type === 'text' ? c.text : ''))
          .join('');
      }
      const toolCalls = this.processToolCalls(response);
      return {
        content,
        tool_calls: toolCalls,
      };
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return { content: '' };
      }
      throw new Error(`Failed to get tool response from Mistral: ${error}`);
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

      // Use Mistral streaming API
      const stream = await this.client.chat.stream({
        model: this.model,
        messages: formattedMessages as any,
        temperature: this.config.temperature || 0,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
      });

      for await (const chunk of stream) {
        if (controller.signal.aborted) {
          throw new Error('Request aborted');
        }

        const content = chunk.data.choices?.[0]?.delta.content;
        let textContent = content;
        if (Array.isArray(textContent)) {
          textContent = textContent
            .map((c) => (c.type === 'text' ? c.text : ''))
            .join('');
        }
        if (textContent) {
          yield textContent;
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        throw new Error('Request aborted');
      }
      throw error;
    } finally {
      this.cleanupRequest(requestId);
    }
  }
}
