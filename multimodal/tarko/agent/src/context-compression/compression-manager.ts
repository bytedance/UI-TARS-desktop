/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextCompressionStrategy,
  ContextCompressionOptions,
  ContextCompressionLevel,
  CompressionContext,
  CompressionResult,
  AgentEventStream,
} from '@tarko/agent-interface';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { getLogger } from '@tarko/shared-utils';
import { defaultTokenEstimator } from './token-estimator';
import {
  SlidingWindowStrategy,
  ToolResultCompressionStrategy,
  ImageCompressionStrategy,
} from './strategies';

/**
 * Context compression manager
 * 
 * Orchestrates multiple compression strategies to keep context within limits
 * while preserving important information.
 */
export class ContextCompressionManager {
  private logger = getLogger('ContextCompression');
  private strategies: ContextCompressionStrategy[];
  private options: Required<ContextCompressionOptions>;

  constructor(options: ContextCompressionOptions = {}) {
    // Set default options
    this.options = {
      enabled: options.enabled ?? true,
      maxContextTokens: options.maxContextTokens ?? 128000, // Default to 128k context
      level: options.level ?? 'moderate',
      customStrategies: options.customStrategies ?? [],
      compressionThreshold: options.compressionThreshold ?? 0.8,
      targetCompressionRatio: options.targetCompressionRatio ?? 0.6,
      maxImages: options.maxImages ?? 5,
      maxToolResults: options.maxToolResults ?? 10,
      preserveRecent: options.preserveRecent ?? true,
      recentMessageCount: options.recentMessageCount ?? 3,
    };

    // Initialize strategies
    this.strategies = this.initializeStrategies();

    this.logger.info(
      `Context compression initialized | Level: ${this.options.level} | ` +
      `Max tokens: ${this.options.maxContextTokens} | ` +
      `Strategies: ${this.strategies.map(s => s.name).join(', ')}`
    );
  }

  /**
   * Apply compression to message history if needed
   */
  async compressIfNeeded(
    messages: ChatCompletionMessageParam[],
    sessionId: string,
    iteration: number,
    events: AgentEventStream.Event[] = []
  ): Promise<CompressionResult> {
    if (!this.options.enabled) {
      const tokens = defaultTokenEstimator.estimateMessagesTokens(messages);
      return {
        messages,
        stats: {
          originalTokens: tokens,
          compressedTokens: tokens,
          compressionRatio: 1.0,
          originalMessageCount: messages.length,
          compressedMessageCount: messages.length,
          originalImageCount: this.countImages(messages),
          compressedImageCount: this.countImages(messages),
          appliedStrategies: [],
        },
        wasCompressed: false,
      };
    }

    const currentTokens = defaultTokenEstimator.estimateMessagesTokens(messages);
    const context: CompressionContext = {
      currentTokens,
      maxTokens: this.options.maxContextTokens,
      iteration,
      sessionId,
      events,
    };

    // Check if compression is needed
    const threshold = this.options.maxContextTokens * this.options.compressionThreshold;
    if (currentTokens < threshold) {
      this.logger.debug(
        `No compression needed | Current: ${currentTokens} tokens | ` +
        `Threshold: ${threshold} tokens | Session: ${sessionId}`
      );
      
      return {
        messages,
        stats: {
          originalTokens: currentTokens,
          compressedTokens: currentTokens,
          compressionRatio: 1.0,
          originalMessageCount: messages.length,
          compressedMessageCount: messages.length,
          originalImageCount: this.countImages(messages),
          compressedImageCount: this.countImages(messages),
          appliedStrategies: [],
        },
        wasCompressed: false,
      };
    }

    this.logger.info(
      `Applying context compression | Current: ${currentTokens} tokens | ` +
      `Target: ${Math.floor(this.options.maxContextTokens * this.options.targetCompressionRatio)} tokens | ` +
      `Session: ${sessionId}`
    );

    // Apply strategies in sequence
    let result = {
      messages,
      stats: {
        originalTokens: currentTokens,
        compressedTokens: currentTokens,
        compressionRatio: 1.0,
        originalMessageCount: messages.length,
        compressedMessageCount: messages.length,
        originalImageCount: this.countImages(messages),
        compressedImageCount: this.countImages(messages),
        appliedStrategies: [] as string[],
      },
      wasCompressed: false,
    };

    for (const strategy of this.strategies) {
      if (strategy.shouldCompress(context)) {
        this.logger.debug(`Applying strategy: ${strategy.name}`);
        
        const strategyResult = await strategy.compress(result.messages, context);
        
        if (strategyResult.wasCompressed) {
          result = {
            messages: strategyResult.messages,
            stats: {
              ...result.stats,
              compressedTokens: strategyResult.stats.compressedTokens,
              compressionRatio: strategyResult.stats.originalTokens > 0 
                ? strategyResult.stats.compressedTokens / strategyResult.stats.originalTokens
                : 1.0,
              compressedMessageCount: strategyResult.stats.compressedMessageCount,
              compressedImageCount: strategyResult.stats.compressedImageCount,
              appliedStrategies: [...result.stats.appliedStrategies, ...strategyResult.stats.appliedStrategies],
            },
            wasCompressed: true,
          };
          
          // Update context for next strategy
          context.currentTokens = result.stats.compressedTokens;
          
          // Check if we've reached target compression
          const targetTokens = this.options.maxContextTokens * this.options.targetCompressionRatio;
          if (result.stats.compressedTokens <= targetTokens) {
            this.logger.debug(`Target compression reached: ${result.stats.compressedTokens} tokens`);
            break;
          }
        }
      }
    }

    if (result.wasCompressed) {
      this.logger.info(
        `Context compression completed | ` +
        `Original: ${result.stats.originalTokens} tokens | ` +
        `Compressed: ${result.stats.compressedTokens} tokens | ` +
        `Ratio: ${(result.stats.compressionRatio * 100).toFixed(1)}% | ` +
        `Strategies: ${result.stats.appliedStrategies.join(', ')} | ` +
        `Session: ${sessionId}`
      );
    }

    return result;
  }

  /**
   * Initialize compression strategies based on level
   */
  private initializeStrategies(): ContextCompressionStrategy[] {
    // If custom strategies are provided, use them
    if (this.options.customStrategies.length > 0) {
      return [...this.options.customStrategies];
    }

    // Initialize built-in strategies based on compression level
    const strategies: ContextCompressionStrategy[] = [];

    switch (this.options.level) {
      case 'none':
        // No compression strategies
        break;

      case 'conservative':
        // Only sliding window with large window
        strategies.push(new SlidingWindowStrategy(20, true));
        break;

      case 'moderate':
        // Image compression + tool result compression + sliding window
        strategies.push(new ImageCompressionStrategy(this.options.maxImages, this.options.preserveRecent));
        strategies.push(new ToolResultCompressionStrategy(500, 0.4));
        strategies.push(new SlidingWindowStrategy(15, true));
        break;

      case 'aggressive':
        // All strategies with aggressive settings
        strategies.push(new ImageCompressionStrategy(Math.floor(this.options.maxImages * 0.6), this.options.preserveRecent));
        strategies.push(new ToolResultCompressionStrategy(300, 0.3));
        strategies.push(new SlidingWindowStrategy(10, true));
        break;

      default:
        // Default to moderate
        strategies.push(new ImageCompressionStrategy(this.options.maxImages, this.options.preserveRecent));
        strategies.push(new ToolResultCompressionStrategy(500, 0.4));
        strategies.push(new SlidingWindowStrategy(15, true));
        break;
    }

    return strategies;
  }

  /**
   * Count images in message array
   */
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

  /**
   * Get current compression options
   */
  getOptions(): Required<ContextCompressionOptions> {
    return { ...this.options };
  }

  /**
   * Update compression options
   */
  updateOptions(newOptions: Partial<ContextCompressionOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.strategies = this.initializeStrategies();
    
    this.logger.info(
      `Context compression options updated | Level: ${this.options.level} | ` +
      `Strategies: ${this.strategies.map(s => s.name).join(', ')}`
    );
  }
}
