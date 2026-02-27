/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { getLogger } from '@tarko/shared-utils';
import { TokenCounter } from './token-counter';

/**
 * Safety guards to prevent context overflow in extreme scenarios
 */
export class ContextSafetyGuards {
  private logger = getLogger('ContextSafetyGuards');
  
  constructor(private tokenCounter: TokenCounter) {}
  
  /**
   * Emergency compression when normal strategies fail
   * This is a last resort to prevent complete failure
   */
  async emergencyCompress(
    messages: ChatCompletionMessageParam[],
    maxTokens: number
  ): Promise<ChatCompletionMessageParam[]> {
    this.logger.warn('Emergency compression triggered - normal strategies failed');
    
    const contextWindow = this.tokenCounter.getContextWindow();
    const emergencyLimit = Math.floor(contextWindow * 0.5); // Use only 50% in emergency
    
    // Step 1: Keep only system messages and last user message
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];
    
    let emergencyMessages: ChatCompletionMessageParam[] = [];
    
    // Always try to keep system messages
    if (systemMessages.length > 0) {
      const systemTokens = await this.tokenCounter.countTokens(systemMessages);
      if (systemTokens < emergencyLimit * 0.3) { // Use max 30% for system
        emergencyMessages.push(...systemMessages);
      } else {
        // Truncate system message if too long
        emergencyMessages.push(await this.truncateMessage(systemMessages[0], emergencyLimit * 0.2));
      }
    }
    
    // Add last user message if possible
    if (lastUserMessage) {
      const currentTokens = await this.tokenCounter.countTokens(emergencyMessages);
      const remainingTokens = emergencyLimit - currentTokens;
      
      if (remainingTokens > 100) { // Need at least 100 tokens for user message
        const userMessageTokens = await this.tokenCounter.countMessageTokens(lastUserMessage);
        if (userMessageTokens <= remainingTokens) {
          emergencyMessages.push(lastUserMessage);
        } else {
          // Truncate user message
          emergencyMessages.push(await this.truncateMessage(lastUserMessage, remainingTokens));
        }
      }
    }
    
    this.logger.warn(
      `Emergency compression: ${messages.length} → ${emergencyMessages.length} messages`
    );
    
    return emergencyMessages;
  }
  
  /**
   * Truncate a single message to fit within token limit
   */
  private async truncateMessage(
    message: ChatCompletionMessageParam,
    maxTokens: number
  ): Promise<ChatCompletionMessageParam> {
    if (typeof message.content === 'string') {
      // Simple truncation for string content
      const targetLength = Math.floor(maxTokens * 3.5); // ~3.5 chars per token
      if (message.content.length > targetLength) {
        const truncated = message.content.substring(0, targetLength - 50) + 
          '... [truncated for context limit]';
        return { ...message, content: truncated };
      }
    } else if (Array.isArray(message.content)) {
      // For multimodal content, keep text parts and truncate if needed
      const textParts = message.content.filter(part => part.type === 'text');
      if (textParts.length > 0) {
        const firstTextPart = textParts[0] as any;
        const targetLength = Math.floor(maxTokens * 3.5);
        if (firstTextPart.text && firstTextPart.text.length > targetLength) {
          return {
          ...message,
          content: [{
          type: 'text',
          text: firstTextPart.text.substring(0, targetLength - 50) + 
          '... [truncated for context limit]'
          }]
          } as ChatCompletionMessageParam;
        }
      }
    }
    
    return message;
  }
  
  /**
   * Validate that messages can fit in context window
   */
  async validateContextSize(
    messages: ChatCompletionMessageParam[],
    safetyMargin: number = 0.1 // 10% safety margin
  ): Promise<{
    isValid: boolean;
    currentTokens: number;
    maxTokens: number;
    exceedsBy?: number;
  }> {
    const currentTokens = await this.tokenCounter.countTokens(messages);
    const maxTokens = this.tokenCounter.getContextWindow();
    const safeLimit = Math.floor(maxTokens * (1 - safetyMargin));
    
    const isValid = currentTokens <= safeLimit;
    const exceedsBy = isValid ? undefined : currentTokens - safeLimit;
    
    return {
      isValid,
      currentTokens,
      maxTokens: safeLimit,
      exceedsBy,
    };
  }
  
  /**
   * Check if a single message is too large
   */
  async checkOversizedMessage(
    message: ChatCompletionMessageParam
  ): Promise<{
    isOversized: boolean;
    tokens: number;
    maxAllowed: number;
  }> {
    const tokens = await this.tokenCounter.countMessageTokens(message);
    const maxAllowed = Math.floor(this.tokenCounter.getContextWindow() * 0.3); // Max 30% for single message
    
    return {
      isOversized: tokens > maxAllowed,
      tokens,
      maxAllowed,
    };
  }
  
  /**
   * Preprocess messages to handle oversized content
   */
  async preprocessMessages(
    messages: ChatCompletionMessageParam[]
  ): Promise<ChatCompletionMessageParam[]> {
    const processedMessages: ChatCompletionMessageParam[] = [];
    
    for (const message of messages) {
      const check = await this.checkOversizedMessage(message);
      
      if (check.isOversized) {
        this.logger.warn(
          `Oversized message detected: ${check.tokens} tokens (max: ${check.maxAllowed}). Truncating...`
        );
        
        const truncated = await this.truncateMessage(message, check.maxAllowed);
        processedMessages.push(truncated);
      } else {
        processedMessages.push(message);
      }
    }
    
    return processedMessages;
  }
}
