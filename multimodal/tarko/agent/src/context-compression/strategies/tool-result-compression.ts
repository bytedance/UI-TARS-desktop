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
 * Tool result compression strategy
 * 
 * Compresses large tool results by truncating or summarizing them.
 * Particularly useful for tools that return large amounts of data.
 */
export class ToolResultCompressionStrategy implements ContextCompressionStrategy {
  readonly name = 'tool_result_compression';
  readonly description = 'Compresses large tool results to reduce context size';

  constructor(
    private maxToolResultTokens: number = 500,
    private compressionRatio: number = 0.3
  ) {}

  shouldCompress(context: CompressionContext): boolean {
    const threshold = context.maxTokens * 0.7; // Compress when 70% full
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

    const compressedMessages = messages.map(message => {
      if (message.role === 'tool') {
        return this.compressToolMessage(message);
      }
      return message;
    });

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
      wasCompressed: compressedTokens < originalTokens,
    };
  }

  private compressToolMessage(message: ChatCompletionMessageParam): ChatCompletionMessageParam {
    if (typeof message.content !== 'string') {
      return message;
    }

    const contentTokens = defaultTokenEstimator.estimateTextTokens(message.content);
    
    if (contentTokens <= this.maxToolResultTokens) {
      return message;
    }

    // Calculate target length for compression
    const targetTokens = Math.floor(this.maxToolResultTokens * this.compressionRatio);
    const targetLength = Math.floor(targetTokens * 3.5); // Approximate chars per token

    let compressedContent: string;

    try {
      // Try to parse as JSON and compress structured data
      const jsonData = JSON.parse(message.content);
      compressedContent = this.compressJsonData(jsonData, targetLength);
    } catch {
      // Not JSON, treat as plain text
      compressedContent = this.compressPlainText(message.content, targetLength);
    }

    return {
      ...message,
      content: compressedContent + '\n\n[Content truncated for context management]',
    };
  }

  private compressJsonData(data: any, targetLength: number): string {
    // For structured data, try to preserve important fields
    if (typeof data === 'object' && data !== null) {
      const compressed: any = {};
      
      // Preserve important-looking fields first
      const importantFields = ['error', 'status', 'result', 'success', 'message', 'title', 'name', 'id'];
      
      for (const field of importantFields) {
        if (field in data) {
          compressed[field] = data[field];
        }
      }
      
      // Add other fields until we reach target length
      const currentJson = JSON.stringify(compressed, null, 2);
      if (currentJson.length < targetLength) {
        const remainingLength = targetLength - currentJson.length;
        
        for (const [key, value] of Object.entries(data)) {
          if (!importantFields.includes(key)) {
            const fieldJson = JSON.stringify({ [key]: value }, null, 2);
            if (currentJson.length + fieldJson.length < targetLength) {
              compressed[key] = value;
            } else {
              // Truncate this field
              if (typeof value === 'string') {
                const truncatedLength = remainingLength - key.length - 10; // Buffer for JSON syntax
                compressed[key] = value.substring(0, Math.max(0, truncatedLength)) + '...';
              }
              break;
            }
          }
        }
      }
      
      return JSON.stringify(compressed, null, 2);
    }
    
    return JSON.stringify(data).substring(0, targetLength);
  }

  private compressPlainText(text: string, targetLength: number): string {
    if (text.length <= targetLength) {
      return text;
    }

    // Try to preserve the beginning and end
    const headLength = Math.floor(targetLength * 0.6);
    const tailLength = Math.floor(targetLength * 0.3);
    
    const head = text.substring(0, headLength);
    const tail = text.substring(text.length - tailLength);
    
    return head + '\n\n[... content omitted ...]\n\n' + tail;
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
