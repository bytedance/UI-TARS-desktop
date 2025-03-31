import dotenv from 'dotenv';
import { MCPServerName, Message } from '@agent-infra/shared';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { mapToolKeysToAzureTools } from '../../main/mcp/tools';
import { createMcpClient } from '../../main/mcp/client';
import { listCustomTools } from '../../main/customTools';
import { ProviderFactory } from './ProviderFactory';
import {
  LLMConfig,
  LLMProvider,
  LLMResponse,
  ToolChoice,
} from './interfaces/LLMProvider';
import { logger } from '@main/utils/logger';
import { maskSensitiveData } from '@main/utils/maskSensitiveData';

// Load environment variables
dotenv.config();

// Export interfaces and types from LLMProvider for convenience
export type {
  LLMConfig,
  LLMResponse,
  ToolChoice,
  LLMProvider,
} from './interfaces/LLMProvider';

/**
 * Unified LLM class that uses different providers based on configuration
 */
export class LLM {
  private provider: LLMProvider;
  private config: LLMConfig;

  constructor(config: LLMConfig = {}) {
    this.config = config;
    // FIXME: config.configName does not exist !!!
    // Create provider instance based on the model or explicit provider setting
    this.provider = ProviderFactory.createProvider(config, config.configName);
  }

  /**
   * Get the current provider
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Change the provider or model at runtime
   */
  setProvider(config: LLMConfig = {}, providerName?: string): void {
    this.config = { ...this.config, ...config };
    this.provider = ProviderFactory.createProvider(
      this.config,
      providerName || config.configName,
    );
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
    return this.provider.askLLMText({ messages, requestId });
  }

  /**
   * Send a message to the LLM with tools and get a response with potential tool calls
   */
  async askTool({
    messages,
    tools,
    mcpServerKeys,
    requestId,
    toolChoice,
  }: {
    messages: Message[];
    tools: ChatCompletionTool[];
    mcpServerKeys?: (MCPServerName | string)[];
    requestId: string;
    toolChoice?: ToolChoice;
  }): Promise<LLMResponse> {
    const mcpClient = await createMcpClient();
    const mcpTools = await mcpClient.listTools();
    const customTools = listCustomTools();
    const normalizeMcpTools = mapToolKeysToAzureTools(
      mcpTools,
      mcpServerKeys || [],
    );

    const allTools = [...tools, ...normalizeMcpTools, ...customTools];
    return await this.provider.askTool({
      messages,
      tools: allTools,
      requestId,
      toolChoice: toolChoice || 'auto',
    });
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
    yield* this.provider.askLLMTextStream({ messages, requestId });
  }

  /**
   * Abort an active request
   */
  abortRequest(requestId: string): boolean {
    if ('abortRequest' in this.provider) {
      return this.provider.abortRequest(requestId);
    }
    return false;
  }

  /**
   * Get a list of available providers
   */
  static getAvailableProviders(): string[] {
    return ProviderFactory.getAvailableProviders();
  }
}

export function createLLM(config: LLMConfig): LLM {
  logger.info('[LLM] Creating LLM with config:', maskSensitiveData(config));
  return new LLM(config);
}
