/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { getLogger } from '@tarko/shared-utils';

/**
 * Token counter interface for different models/providers
 */
export interface TokenCounter {
  /**
   * Count tokens in messages
   * @param messages Messages to count tokens for
   * @returns Estimated token count
   */
  countTokens(messages: ChatCompletionMessageParam[]): Promise<number>;

  /**
   * Count tokens in a single message
   * @param message Message to count tokens for
   * @returns Estimated token count
   */
  countMessageTokens(message: ChatCompletionMessageParam): Promise<number>;

  /**
   * Get the context window size for the model
   * @returns Maximum context window size in tokens
   */
  getContextWindow(): number;
}

/**
 * Simple token counter implementation using character-based estimation
 * This provides a fast approximation for token counting
 */
export class SimpleTokenCounter implements TokenCounter {
  private logger = getLogger('SimpleTokenCounter');
  
  constructor(
    private modelId: string,
    private contextWindow: number = 128000, // Default context window
    private tokensPerChar: number = 0.25, // Rough estimate: 4 characters per token
  ) {}

  async countTokens(messages: ChatCompletionMessageParam[]): Promise<number> {
    let totalTokens = 0;
    
    for (const message of messages) {
      totalTokens += await this.countMessageTokens(message);
    }
    
    // Add overhead for message formatting (role, structure, etc.)
    const overhead = Math.ceil(messages.length * 10); // ~10 tokens per message overhead
    
    return totalTokens + overhead;
  }

  async countMessageTokens(message: ChatCompletionMessageParam): Promise<number> {
    let content = '';
    
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      // Count text content, images are estimated separately
      for (const part of message.content) {
        if (part.type === 'text') {
          content += part.text;
        } else if (part.type === 'image_url') {
          // Images typically use ~765 tokens for vision models
          content += ' '.repeat(765 * 4); // Approximate as characters
        }
      }
    }
    
    // Add role and other fields
    content += message.role;
    if ('name' in message && message.name) {
      content += message.name;
    }
    
    // Count tool calls if present
    if ('tool_calls' in message && message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        content += toolCall.function.name;
        content += toolCall.function.arguments;
      }
    }
    
    return Math.ceil(content.length * this.tokensPerChar);
  }

  getContextWindow(): number {
    return this.contextWindow;
  }
}

/**
 * Get appropriate token counter for a model
 * @param modelId Model identifier
 * @param provider Model provider
 * @returns Token counter instance
 */
export function getTokenCounter(modelId: string, provider: string): TokenCounter {
  // Model-specific context windows
  const contextWindows: Record<string, number> = {
    // OpenAI models
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    
    // Anthropic models
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-haiku-20241022': 200000,
    'claude-3-opus-20240229': 200000,
    
    // Google models
    'gemini-1.5-pro': 2097152,
    'gemini-1.5-flash': 1048576,
    'gemini-2.0-flash': 1048576,
    
    // Default
    'default': 128000,
  };
  
  const contextWindow = contextWindows[modelId] || contextWindows['default'];
  
  // For now, use simple token counter for all models
  // In the future, we could integrate with tiktoken or model-specific counters
  return new SimpleTokenCounter(modelId, contextWindow);
}

/**
 * Get context window size for a model
 * @param modelId Model identifier
 * @param provider Model provider
 * @returns Context window size in tokens
 */
export function getModelContextWindow(modelId: string, provider: string): number {
  const counter = getTokenCounter(modelId, provider);
  return counter.getContextWindow();
}
