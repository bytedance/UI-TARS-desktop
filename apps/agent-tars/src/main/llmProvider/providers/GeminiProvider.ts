import { Message, ToolCall } from '@agent-infra/shared';
import { ChatCompletionTool } from 'openai/resources';
import {
  GoogleGenerativeAI,
  EnhancedGenerateContentResponse,
  FunctionDeclaration,
  SchemaType,
} from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import { LLMConfig, LLMResponse, ToolChoice } from '../interfaces/LLMProvider';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

/**
 * Google Gemini provider implementation
 */
export class GeminiProvider extends BaseProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(config: LLMConfig = {}) {
    super(config);

    // Use environment variables or defaults
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or provide in config.',
      );
    }

    logger.info('[GeminiProvider]', maskSensitiveData({ apiKey }));

    // Initialize client with the actual SDK
    this.client = new GoogleGenerativeAI(apiKey);

    // Set default model or use provided one
    this.model =
      config.model || process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-pro';

    logger.info(
      '[GeminiProvider]',
      maskSensitiveData({ apiKey, model: this.model }),
    );
  }

  /**
   * Convert Message objects to Google Gemini API format
   */
  protected formatMessages(messages: Message[]): any[] {
    return messages.map((message) => {
      const role = message.role === 'system' ? 'user' : message.role;
      return {
        role,
        parts: [{ text: message.content }],
      };
    });
  }

  /**
   * Process tool calls from Gemini response
   */
  private processToolCalls(
    response: EnhancedGenerateContentResponse,
  ): ToolCall[] | undefined {
    // Check if there are any function calls in the response
    const functionCallResults = response.functionCalls();
    if (!functionCallResults || functionCallResults.length === 0) {
      return undefined;
    }

    return functionCallResults.map((callResult, index) => ({
      id: `gemini-function-call-${Date.now()}-${index}`,
      type: 'function',
      function: {
        name: callResult.name,
        arguments: callResult.args ? JSON.stringify(callResult.args) : '{}',
      },
    }));
  }

  /**
   * Extract text content from Gemini response
   */
  private extractTextContent(
    response: EnhancedGenerateContentResponse,
  ): string {
    return response.text() || '';
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

      // Create a generative model instance
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: this.config.topP,
        },
      });

      // Use chat API to send messages
      const chat = generativeModel.startChat();
      const result = await chat.sendMessage(
        formattedMessages.map((message) => message.parts[0].text).join('\n'),
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      return this.extractTextContent(result.response);
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return '';
      }
      throw new Error(`Failed to get response from Gemini: ${error}`);
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

      // Convert OpenAI-style tools to Gemini function declarations
      const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description || '',
        parameters: tool.function.parameters
          ? {
              type: SchemaType.OBJECT,
              properties: Object.entries(
                tool.function.parameters.properties || {},
              ).reduce(
                (acc, [key, value]) => {
                  // Convert each property to a format Gemini expects
                  acc[key] = convertOpenAISchemaToGemini(value);
                  return acc;
                },
                {
                  // Add an extra properties to avoid runtime error for gemeni
                  message: {
                    type: 'string',
                    description: 'the user input message',
                  },
                } as Record<string, any>,
              ),
              // Copy over required fields if present
            }
          : undefined,
      }));

      function convertOpenAISchemaToGemini(schema: any): any {
        if (!schema) return {};

        // Basic conversion based on type
        if (schema.type === 'object') {
          return {
            type: SchemaType.OBJECT,
            properties: Object.entries(schema.properties || {}).reduce(
              (acc, [key, value]) => {
                acc[key] = convertOpenAISchemaToGemini(value);
                return acc;
              },
              {} as Record<string, any>,
            ),
            ...(schema.required && { required: schema.required }),
            ...(schema.description && { description: schema.description }),
          };
        } else if (schema.type === 'array') {
          return {
            type: SchemaType.ARRAY,
            items: convertOpenAISchemaToGemini(schema.items),
            ...(schema.description && { description: schema.description }),
          };
        } else if (schema.type === 'string') {
          return {
            type: SchemaType.STRING,
            ...(schema.enum && { enum: schema.enum, format: 'enum' }),
            ...(schema.description && { description: schema.description }),
          };
        } else if (schema.type === 'number') {
          return {
            type: SchemaType.NUMBER,
            ...(schema.description && { description: schema.description }),
          };
        } else if (schema.type === 'integer') {
          return {
            type: SchemaType.INTEGER,
            ...(schema.description && { description: schema.description }),
          };
        } else if (schema.type === 'boolean') {
          return {
            type: SchemaType.BOOLEAN,
            ...(schema.description && { description: schema.description }),
          };
        }

        // Fallback
        return {
          type: SchemaType.STRING,
          ...(schema.description && { description: schema.description }),
        };
      }

      // Create a generative model instance with tools
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: this.config.topP,
        },
        tools: [{ functionDeclarations }],
      });

      // Use chat API to send messages
      const chat = generativeModel.startChat();
      const result = await chat.sendMessage(
        formattedMessages.map((message) => message.parts[0].text).join('\n'),
        {
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted) {
        throw new Error('Request aborted');
      }

      this.cleanupRequest(requestId);
      const content = this.extractTextContent(result.response);
      const toolCalls = this.processToolCalls(result.response);
      return { content, tool_calls: toolCalls };
    } catch (error: any) {
      this.cleanupRequest(requestId);
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        return { content: '' };
      }
      throw new Error(`Failed to get tool response from Gemini: ${error}`);
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

      // Create a generative model instance
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens,
          topP: this.config.topP,
        },
      });

      // Use chat API to send messages and get streaming response
      const chat = generativeModel.startChat();
      const streamingResponse = await chat.sendMessageStream(
        formattedMessages[formattedMessages.length - 1].parts[0].text,
      );

      for await (const chunk of streamingResponse.stream) {
        if (controller.signal.aborted) {
          throw new Error('Request aborted');
        }

        const textChunk = chunk.text();
        if (textChunk) {
          yield textChunk;
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
