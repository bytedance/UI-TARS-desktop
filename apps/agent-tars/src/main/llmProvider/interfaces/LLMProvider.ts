import { Message, ToolCall } from '@agent-infra/shared';
import { ChatCompletionTool } from 'openai/resources';

/**
 * Common interface for all LLM provider configurations
 */
export interface LLMConfig {
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  configName?: string;
  baseURL?: string;
  apiVersion?: string;
}

/**
 * Standardized response format from LLM providers
 */
export interface LLMResponse {
  content: string | null;
  tool_calls?: ToolCall[];
}

/**
 * Defines how tools should be chosen by the LLM
 */
export type ToolChoice = 'none' | 'auto' | 'required';

/**
 * Common interface for all LLM providers
 */
export interface LLMProvider {
  /**
   * Send a message to the LLM and get a text response
   */
  askLLMText(params: {
    messages: Message[];
    requestId: string;
  }): Promise<string>;

  /**
   * Send a message to the LLM with tools and get a response with potential tool calls
   */
  askTool(params: {
    messages: Message[];
    tools: ChatCompletionTool[];
    requestId: string;
    toolChoice?: ToolChoice;
  }): Promise<LLMResponse>;

  /**
   * Send a message to the LLM and get a streaming response
   */
  askLLMTextStream(params: {
    messages: Message[];
    requestId: string;
  }): AsyncGenerator<string>;

  /**
   * Abort an active request
   */
  abortRequest(requestId: string): boolean;
}
