import Anthropic from '@anthropic-ai/sdk';
import { Message, ToolCall } from '@agent-infra/shared';
import { ChatCompletionTool } from 'openai/resources';
import { BaseProvider } from './BaseProvider';
import { LLMConfig, LLMResponse, ToolChoice } from '../interfaces/LLMProvider';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

/**
 * Helper to convert OpenAI tool format to Anthropic tool format
 */
function convertOpenAIToolsToAnthropic(
  tools: ChatCompletionTool[],
): Anthropic.Tool[] {
  return tools.map((tool) => {
    if (tool.type === 'function') {
      return {
        name: tool.function.name,
        description: tool.function.description,
        input_schema: tool.function.parameters as any,
      };
    }
    throw new Error(`Unsupported tool type: ${tool.type}`);
  });
}

/**
 * Anthropic provider implementation
 */
export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMConfig = {}) {
    super(config);

    // Use environment variables or defaults
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const baseURL = config.baseURL || process.env.ANTHROPIC_API_BASE_URL || '';

    if (!apiKey) {
      throw new Error(
        'Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or provide in config.',
      );
    }

    logger.info('[AnthropicProvider]', maskSensitiveData({ apiKey, baseURL }));
    this.client = new Anthropic({
      apiKey,
      ...(baseURL && { baseURL }),
    });

    this.model =
      config.model ||
      process.env.ANTHROPIC_DEFAULT_MODEL ||
      'claude-3-7-sonnet-latest';
  }

  /**
   * Convert Message objects to Anthropic API format
   */
  protected formatMessages(messages: Message[]): Anthropic.MessageParam[] {
    // Need to convert the messages from OpenAI format to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = [];

    // First, extract system message if present
    const systemMsgIndex = messages.findIndex((m) => m.role === 'system');
    if (systemMsgIndex >= 0) {
      // Remove system message as it's handled separately
      messages = [
        ...messages.slice(0, systemMsgIndex),
        ...messages.slice(systemMsgIndex + 1),
      ];
    }

    // Convert remaining messages to Anthropic format
    for (const msg of messages) {
      if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content || '',
        });
      } else if (msg.role === 'assistant') {
        const assistantMsg: Anthropic.MessageParam = {
          role: 'assistant',
          content: msg.content || '',
        };

        // Handle tool calls
        if (msg.tool_calls) {
          const content: Anthropic.ContentBlock[] = [
            { type: 'text', text: msg.content || '', citations: [] },
          ];

          // Add tool calls
          for (const toolCall of msg.tool_calls) {
            content.push({
              type: 'tool_use',
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments || '{}'),
            });
          }

          assistantMsg.content = content;
        }

        anthropicMessages.push(assistantMsg);
      } else if (msg.role === 'tool') {
        // Find the last assistant message
        const lastAssistantIdx = anthropicMessages.length - 1;
        if (
          lastAssistantIdx >= 0 &&
          anthropicMessages[lastAssistantIdx].role === 'assistant'
        ) {
          // Add tool output to the assistant's message content
          const assistantMsg = anthropicMessages[lastAssistantIdx];
          const content = Array.isArray(assistantMsg.content)
            ? assistantMsg.content
            : [];

          content.push({
            type: 'tool_result',
            tool_use_id: msg.tool_call_id!,
            content: msg.content || '',
          });

          anthropicMessages[lastAssistantIdx].content = content;
        }
      }
    }

    return anthropicMessages;
  }

  /**
   * Process tool calls from Anthropic response
   */
  private processToolCalls(
    response: Anthropic.Message,
  ): ToolCall[] | undefined {
    if (!response.content || !Array.isArray(response.content)) {
      return undefined;
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUses.length === 0) {
      return undefined;
    }

    return toolUses.map((toolUse) => ({
      id: toolUse.id,
      type: 'function' as const,
      function: {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input),
      },
    }));
  }

  /**
   * Extract text content from Anthropic response
   */
  private extractTextContent(response: Anthropic.Message): string {
    if (typeof response.content === 'string') {
      return response.content;
    }

    if (Array.isArray(response.content)) {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text',
      );
      return textBlocks.map((block) => block.text).join('');
    }

    return '';
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

      // Extract system message if present at the beginning
      let systemMessage = '';
      const systemMsgIndex = messages.findIndex((m) => m.role === 'system');
      if (systemMsgIndex >= 0) {
        systemMessage = messages[systemMsgIndex].content || '';
      }

      const response = await this.client.messages.create(
        {
          model: this.model,
          messages: formattedMessages,
          system: systemMessage,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens || 8192,
          top_p: this.config.topP,
        },
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }
      this.cleanupRequest(requestId);
      return this.extractTextContent(response);
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return '';
      }
      throw new Error(`Failed to get response from Anthropic: ${error}`);
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

      // Extract system message if present
      let systemMessage = '';
      const systemMsgIndex = messages.findIndex((m) => m.role === 'system');
      if (systemMsgIndex >= 0) {
        systemMessage = messages[systemMsgIndex].content || '';
      }

      // Convert tools to Anthropic format
      const anthropicTools = convertOpenAIToolsToAnthropic(tools);

      const response = await this.client.messages.create(
        {
          model: this.model,
          messages: formattedMessages,
          system: systemMessage,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens || 4000,
          top_p: this.config.topP,
          tools: anthropicTools,
          tool_choice:
            toolChoice === 'required' ? { type: 'any' } : { type: 'auto' },
        },
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      const content = this.extractTextContent(response);
      const toolCalls = this.processToolCalls(response);
      return { content, tool_calls: toolCalls };
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return { content: '' };
      }
      throw new Error(`Failed to get tool response from Anthropic: ${error}`);
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

      // Extract system message if present
      let systemMessage = '';
      const systemMsgIndex = messages.findIndex((m) => m.role === 'system');
      if (systemMsgIndex >= 0) {
        systemMessage = messages[systemMsgIndex].content || '';
      }

      const stream = await this.client.messages.create(
        {
          model: this.model,
          messages: formattedMessages,
          system: systemMessage,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens || 4000,
          top_p: this.config.topP,
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

        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta?.type === 'text_delta'
        ) {
          yield chunk.delta.text;
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
