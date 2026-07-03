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
import { ChatCompletionMessageParam, ChatCompletionContentPart } from '@tarko/model-provider/types';
import { defaultTokenEstimator } from '../token-estimator';

/**
 * Image compression strategy
 * 
 * Reduces the number of images in context by applying a sliding window
 * and replacing older images with text descriptions.
 */
export class ImageCompressionStrategy implements ContextCompressionStrategy {
  readonly name = 'image_compression';
  readonly description = 'Reduces image count by replacing older images with text placeholders';

  constructor(
    private maxImages: number = 5,
    private preserveRecent: boolean = true
  ) {}

  shouldCompress(context: CompressionContext): boolean {
    const threshold = context.maxTokens * 0.6; // Compress when 60% full
    return context.currentTokens >= threshold;
  }

  compress(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): CompressionResult {
    const originalTokens = defaultTokenEstimator.estimateMessagesTokens(messages);
    const originalMessageCount = messages.length;
    const originalImageCount = this.countImages(messages);

    if (!this.shouldCompress(context) || originalImageCount <= this.maxImages) {
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

    // Collect all image references with their positions
    const imageReferences = this.collectImageReferences(messages);
    
    // Determine which images to keep (most recent ones)
    const imagesToKeep = this.preserveRecent 
      ? imageReferences.slice(-this.maxImages)
      : imageReferences.slice(0, this.maxImages);
    
    const imagesToCompress = new Set(
      imageReferences
        .filter(ref => !imagesToKeep.includes(ref))
        .map(ref => `${ref.messageIndex}:${ref.contentIndex}`)
    );

    // Process messages and compress images
    const compressedMessages = messages.map((message, messageIndex) => {
      if (Array.isArray(message.content)) {
        const compressedContent = message.content.map((part: any, contentIndex) => {
          const key = `${messageIndex}:${contentIndex}`;
          if (imagesToCompress.has(key) && this.isImagePart(part)) {
            return {
              type: 'text' as const,
              text: '[Image omitted to conserve context]'
            };
          }
          return part;
        });
        
        return {
          ...message,
          content: compressedContent
        } as ChatCompletionMessageParam;
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
      wasCompressed: true,
    };
  }

  private collectImageReferences(messages: ChatCompletionMessageParam[]): ImageReference[] {
    const references: ImageReference[] = [];
    
    for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
      const message = messages[messageIndex];
      
      if (Array.isArray(message.content)) {
        for (let contentIndex = 0; contentIndex < message.content.length; contentIndex++) {
          const part = message.content[contentIndex] as any;
          if (this.isImagePart(part)) {
            references.push({ messageIndex, contentIndex });
          }
        }
      }
    }
    
    return references;
  }

  private isImagePart(part: any): boolean {
    return typeof part === 'object' && (part.type === 'image_url' || part.type === 'image');
  }

  private countImages(messages: ChatCompletionMessageParam[]): number {
    return messages.reduce((count, message) => {
      if (Array.isArray(message.content)) {
        return count + message.content.filter((part: any) => this.isImagePart(part)).length;
      }
      return count;
    }, 0);
  }
}

interface ImageReference {
  messageIndex: number;
  contentIndex: number;
}
