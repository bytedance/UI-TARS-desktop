/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextCompressionStrategy,
  CompressionContext,
  CompressionResult,
  CompressionStats,
} from '@tarko/agent-interface';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { defaultTokenEstimator } from '../token-estimator';

/**
 * Sliding window compression strategy
 * 
 * Keeps the most recent messages and system prompt while removing older messages.
 * This is the most conservative strategy that preserves conversation flow.
 */
export class SlidingWindowStrategy implements ContextCompressionStrategy {
  readonly name = 'sliding_window';
  readonly description = 'Keeps recent messages within a sliding window, removing older conversation history';

  constructor(
    private windowSize: number = 10,
    private preserveSystemPrompt: boolean = true
  ) {}

  shouldCompress(context: CompressionContext): boolean {
    const threshold = context.maxTokens * 0.8; // Compress when 80% full
    return context.currentTokens >= threshold;
  }

  compress(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): CompressionResult {
    const originalTokens = defaultTokenEstimator.estimateMessagesTokens(messages);
    const originalMessageCount = messages.length;
    const originalImageCount = this.countImages(messages);

    if (!this.shouldCompress(context)) {
      return {
        messages,
        stats: {
          originalTokens,
          compressedTokens: originalTokens,
          compressionRatio: 1.0,
          originalMessageCount,
          compressedMessageCount: originalMessageCount,
          originalImageCount,
          compressedImageCount: originalImageCount,
          appliedStrategies: [],
        },
        wasCompressed: false,
      };
    }

    let compressedMessages: ChatCompletionMessageParam[] = [];
    
    // Always preserve system prompt if it exists and we're configured to do so
    if (this.preserveSystemPrompt && messages.length > 0 && messages[0].role === 'system') {
      compressedMessages.push(messages[0]);
    }

    // Take the last N messages (excluding system prompt if preserved)
    const startIndex = this.preserveSystemPrompt && messages[0]?.role === 'system' ? 1 : 0;
    const availableMessages = messages.slice(startIndex);
    const recentMessages = availableMessages.slice(-this.windowSize);
    
    compressedMessages.push(...recentMessages);

    const compressedTokens = defaultTokenEstimator.estimateMessagesTokens(compressedMessages);
    const compressedImageCount = this.countImages(compressedMessages);

    const stats: CompressionStats = {
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      originalMessageCount,
      compressedMessageCount: compressedMessages.length,
      originalImageCount,
      compressedImageCount,
      appliedStrategies: [this.name],
    };

    return {
      messages: compressedMessages,
      stats,
      wasCompressed: true,
    };
  }

  private countImages(messages: ChatCompletionMessageParam[]): number {
    return messages.reduce((count, message) => {
      if (Array.isArray(message.content)) {
        return count + message.content.filter(
          (part: any) => typeof part === 'object' && (part.type === 'image_url' || part.type === 'image')
        ).length;
      }
      return count;
    }, 0);
  }
}
