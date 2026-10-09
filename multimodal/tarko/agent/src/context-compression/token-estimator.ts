/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { TokenEstimator } from '@tarko/agent-interface';
import { ChatCompletionMessageParam, ChatCompletionContentPart } from '@tarko/model-provider/types';

/**
 * Simple token estimator based on character count approximation
 * 
 * This provides a fast approximation for token counting without requiring
 * expensive tokenizer operations. The estimates are conservative to avoid
 * context window overflow.
 */
export class SimpleTokenEstimator implements TokenEstimator {
  // Conservative estimates based on typical tokenizer behavior
  private static readonly CHARS_PER_TOKEN = 3.5; // Conservative estimate
  private static readonly IMAGE_BASE_TOKENS = 85; // Base cost for image processing
  private static readonly IMAGE_DETAIL_MULTIPLIER = 170; // Additional tokens per tile for high detail
  private static readonly MESSAGE_OVERHEAD_TOKENS = 10; // Overhead per message (role, formatting, etc.)
  private static readonly TOOL_CALL_OVERHEAD_TOKENS = 20; // Additional overhead for tool calls

  /**
   * Estimate tokens for text content using character-based approximation
   */
  estimateTextTokens(text: string): number {
    if (!text) return 0;
    
    // Simple character-based estimation with conservative multiplier
    const baseTokens = Math.ceil(text.length / SimpleTokenEstimator.CHARS_PER_TOKEN);
    
    // Add small buffer for special tokens and formatting
    return Math.ceil(baseTokens * 1.1);
  }

  /**
   * Estimate tokens for image content
   * Based on OpenAI's vision model token calculation
   */
  estimateImageTokens(imageData: any): number {
    // Base cost for any image
    let tokens = SimpleTokenEstimator.IMAGE_BASE_TOKENS;
    
    // If we have image dimensions, calculate based on tiles
    if (imageData && typeof imageData === 'object') {
      const width = imageData.width || 512;
      const height = imageData.height || 512;
      
      // Calculate number of 512x512 tiles (simplified)
      const tilesX = Math.ceil(width / 512);
      const tilesY = Math.ceil(height / 512);
      const totalTiles = tilesX * tilesY;
      
      // Add tokens for high detail processing
      tokens += totalTiles * SimpleTokenEstimator.IMAGE_DETAIL_MULTIPLIER;
    } else {
      // Conservative estimate for unknown image size
      tokens += SimpleTokenEstimator.IMAGE_DETAIL_MULTIPLIER * 4; // Assume 2x2 tiles
    }
    
    return tokens;
  }

  /**
   * Estimate tokens for a complete message
   */
  estimateMessageTokens(message: ChatCompletionMessageParam): number {
    let tokens = SimpleTokenEstimator.MESSAGE_OVERHEAD_TOKENS;
    
    // Handle different content types
    if (typeof message.content === 'string') {
      tokens += this.estimateTextTokens(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        tokens += this.estimateContentPartTokens(part);
      }
    }
    
    // Add tokens for tool calls if present
    if ('tool_calls' in message && message.tool_calls) {
      tokens += SimpleTokenEstimator.TOOL_CALL_OVERHEAD_TOKENS;
      for (const toolCall of message.tool_calls) {
        tokens += this.estimateTextTokens(toolCall.function.name);
        tokens += this.estimateTextTokens(toolCall.function.arguments);
      }
    }
    
    // Add tokens for tool call ID if present
    if ('tool_call_id' in message && message.tool_call_id) {
      tokens += this.estimateTextTokens(message.tool_call_id);
    }
    
    return tokens;
  }

  /**
   * Estimate tokens for content part (text or image)
   */
  private estimateContentPartTokens(part: ChatCompletionContentPart | any): number {
    if (part.type === 'text') {
      return this.estimateTextTokens(part.text);
    } else if (part.type === 'image_url') {
      // Extract image metadata if available from URL or data
      const imageData = this.extractImageMetadata(part.image_url);
      return this.estimateImageTokens(imageData);
    } else if (part.type === 'image') {
      // Direct image data (legacy support)
      return this.estimateImageTokens(part);
    }
    
    // Unknown content type, conservative estimate
    return 50;
  }

  /**
   * Extract image metadata from image URL object
   */
  private extractImageMetadata(imageUrl: any): any {
    if (!imageUrl) return null;
    
    // Try to extract metadata from the image URL object
    if (typeof imageUrl === 'object') {
      return {
        width: imageUrl.width,
        height: imageUrl.height,
        detail: imageUrl.detail || 'auto'
      };
    }
    
    return null;
  }

  /**
   * Estimate tokens for an array of messages
   */
  estimateMessagesTokens(messages: ChatCompletionMessageParam[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateMessageTokens(message);
    }, 0);
  }
}

/**
 * Default token estimator instance
 */
export const defaultTokenEstimator = new SimpleTokenEstimator();
