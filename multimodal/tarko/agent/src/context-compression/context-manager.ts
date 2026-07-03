/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextCompressionStrategy,
  ContextCompressionConfig,
  CompressionContext,
  CompressionResult,
  CompressionEvent,
  CompressionTrigger,
  DEFAULT_COMPRESSION_CONFIG,
} from './types';
import { TokenCounter, getTokenCounter, getModelContextWindow } from './token-counter';
import { resolveCompressionStrategy } from './strategies/registry';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';
import { getLogger } from '@tarko/shared-utils';
import { ContextSafetyGuards } from './safety-guards';

/**
 * Context Manager - Orchestrates context compression
 * 
 * This class manages the entire context compression lifecycle, including:
 * - Monitoring token usage
 * - Triggering compression when needed
 * - Applying compression strategies
 * - Tracking compression history
 * - Providing compression statistics
 */
export class ContextManager {
  private logger = getLogger('ContextManager');
  private config: ContextCompressionConfig;
  private strategy: ContextCompressionStrategy;
  private tokenCounter: TokenCounter;
  private compressionHistory: CompressionEvent[] = [];
  private compressionCount = 0;
  private safetyGuards: ContextSafetyGuards;
  
  constructor(
    config: Partial<ContextCompressionConfig> = {},
    modelId?: string,
    provider?: string
  ) {
    this.config = { ...DEFAULT_COMPRESSION_CONFIG, ...config };
    this.strategy = resolveCompressionStrategy(this.config.strategy);
    
    // Initialize token counter based on model
    if (modelId && provider) {
      this.tokenCounter = getTokenCounter(modelId, provider);
    } else {
      // Use default token counter
      this.tokenCounter = getTokenCounter('default', 'default');
    }
    
    // Initialize safety guards
    this.safetyGuards = new ContextSafetyGuards(this.tokenCounter);
    
    this.logger.info(
      `ContextManager initialized with strategy: ${this.strategy.name}, ` +
      `threshold: ${(this.config.compressionThreshold * 100).toFixed(1)}%`
    );
  }
  
  /**
   * Update configuration
   * @param config New configuration to merge
   */
  updateConfig(config: Partial<ContextCompressionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update strategy if changed
    if (config.strategy) {
      this.strategy = resolveCompressionStrategy(config.strategy);
      this.logger.info(`Switched to compression strategy: ${this.strategy.name}`);
    }
  }
  
  /**
   * Update model information for token counting
   * @param modelId Model identifier
   * @param provider Model provider
   */
  updateModel(modelId: string, provider: string): void {
    this.tokenCounter = getTokenCounter(modelId, provider);
    this.safetyGuards = new ContextSafetyGuards(this.tokenCounter);
    this.logger.debug(`Updated token counter for model: ${provider}/${modelId}`);
  }
  
  /**
   * Check if compression should be triggered
   * @param messages Current message history
   * @param events Current event stream
   * @param sessionId Session identifier
   * @param iteration Current iteration
   * @returns True if compression should be performed
   */
  async shouldCompress(
    messages: ChatCompletionMessageParam[],
    events: AgentEventStream.Event[],
    sessionId: string,
    iteration: number
  ): Promise<{ shouldCompress: boolean; reason?: CompressionTrigger; currentTokens?: number }> {
    if (!this.config.enabled) {
      return { shouldCompress: false };
    }
    
    // Check compression attempt limit
    if (this.compressionCount >= this.config.maxCompressionAttempts) {
      this.logger.warn(
        `Maximum compression attempts (${this.config.maxCompressionAttempts}) reached for session ${sessionId}`
      );
      return { shouldCompress: false };
    }
    
    // Count current tokens
    const currentTokens = await this.tokenCounter.countTokens(messages);
    const maxTokens = this.tokenCounter.getContextWindow();
    
    // Create compression context
    const context: CompressionContext = {
      messages,
      events,
      currentTokens,
      maxTokens,
      model: {
        id: 'current', // Would be populated with actual model info
        provider: 'current',
        contextWindow: maxTokens,
      },
      session: {
        id: sessionId,
        iteration,
      },
    };
    
    // Check strategy-specific compression trigger
    if (this.strategy.shouldCompress(context)) {
      return {
        shouldCompress: true,
        reason: CompressionTrigger.TOKEN_THRESHOLD,
        currentTokens,
      };
    }
    
    return { shouldCompress: false, currentTokens };
  }
  
  /**
   * Perform compression
   * @param messages Current message history
   * @param events Current event stream
   * @param sessionId Session identifier
   * @param iteration Current iteration
   * @param trigger What triggered the compression
   * @returns Compression result
   */
  async compress(
    messages: ChatCompletionMessageParam[],
    events: AgentEventStream.Event[],
    sessionId: string,
    iteration: number,
    trigger: CompressionTrigger = CompressionTrigger.TOKEN_THRESHOLD
  ): Promise<CompressionResult> {
    if (!this.config.enabled) {
      throw new Error('Compression is disabled');
    }
    
    const startTime = Date.now();
    
    this.logger.info(
      `Starting compression for session ${sessionId} (iteration ${iteration}) using strategy: ${this.strategy.name}`
    );
    
    // Preprocess messages to handle oversized content
    const preprocessedMessages = await this.safetyGuards.preprocessMessages(messages);
    
    // Count current tokens
    const currentTokens = await this.tokenCounter.countTokens(preprocessedMessages);
    const maxTokens = this.tokenCounter.getContextWindow();
    
    // Validate context size
    const validation = await this.safetyGuards.validateContextSize(preprocessedMessages, 0.05); // 5% safety margin
    if (!validation.isValid) {
      this.logger.warn(
        `Context size validation failed: ${validation.currentTokens} tokens exceeds safe limit of ${validation.maxTokens} by ${validation.exceedsBy} tokens`
      );
    }
    
    // Create compression context
    const context: CompressionContext = {
      messages: preprocessedMessages,
      events,
      currentTokens,
      maxTokens,
      model: {
        id: 'current',
        provider: 'current',
        contextWindow: maxTokens,
      },
      session: {
        id: sessionId,
        iteration,
      },
      metadata: {
        trigger,
        compressionCount: this.compressionCount,
      },
    };
    
    try {
      // Perform compression using the selected strategy
      const result = await this.strategy.compress(context);
      
      // Validate compressed result
      const compressedValidation = await this.safetyGuards.validateContextSize(result.messages, 0.1); // 10% safety margin for result
      
      if (!compressedValidation.isValid) {
        this.logger.warn(
          `Compressed result still exceeds limits: ${compressedValidation.currentTokens} tokens. Applying emergency compression...`
        );
        
        // Apply emergency compression
        const emergencyMessages = await this.safetyGuards.emergencyCompress(
          result.messages,
          maxTokens
        );
        
        const emergencyTokens = await this.tokenCounter.countTokens(emergencyMessages);
        
        // Update result with emergency compression
        result.messages = emergencyMessages;
        result.estimatedTokens = emergencyTokens;
        result.stats.compressedTokens = emergencyTokens;
        result.stats.compressedMessageCount = emergencyMessages.length;
        result.stats.compressionRatio = 1 - (emergencyTokens / result.stats.originalTokens);
        result.metadata = {
          ...result.metadata,
          emergencyCompressionApplied: true,
        };
      }
      
      // Update compression count
      this.compressionCount++;
      
      // Record compression event
      const compressionEvent: CompressionEvent = {
        timestamp: Date.now(),
        trigger,
        stats: result.stats,
        sessionId,
        iteration,
      };
      this.compressionHistory.push(compressionEvent);
      
      // Log compression success
      this.logger.info(
        `Compression completed: ${result.stats.originalMessageCount} → ${result.stats.compressedMessageCount} messages, ` +
        `${result.stats.originalTokens} → ${result.stats.compressedTokens} tokens ` +
        `(${(result.stats.compressionRatio * 100).toFixed(1)}% reduction) in ${result.stats.compressionTimeMs}ms` +
        (result.metadata?.emergencyCompressionApplied ? ' [EMERGENCY]' : '')
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Compression failed for session ${sessionId}: ${error}`);
      
      // Last resort: emergency compression
      this.logger.warn('Applying emergency compression as fallback...');
      try {
        const emergencyMessages = await this.safetyGuards.emergencyCompress(
          context.messages,
          maxTokens
        );
        
        const emergencyTokens = await this.tokenCounter.countTokens(emergencyMessages);
        
        return {
          messages: emergencyMessages,
          estimatedTokens: emergencyTokens,
          stats: {
            originalTokens: context.currentTokens,
            compressedTokens: emergencyTokens,
            compressionRatio: 1 - (emergencyTokens / context.currentTokens),
            originalMessageCount: context.messages.length,
            compressedMessageCount: emergencyMessages.length,
            compressionTimeMs: Date.now() - startTime,
            strategy: 'emergency_fallback',
          },
          metadata: {
            emergencyFallback: true,
            originalError: String(error),
          },
        };
      } catch (emergencyError) {
        this.logger.error(`Emergency compression also failed: ${emergencyError}`);
        throw error; // Re-throw original error
      }
    }
  }
  
  /**
   * Manually trigger compression
   * @param messages Current message history
   * @param events Current event stream
   * @param sessionId Session identifier
   * @param iteration Current iteration
   * @returns Compression result
   */
  async manualCompress(
    messages: ChatCompletionMessageParam[],
    events: AgentEventStream.Event[],
    sessionId: string,
    iteration: number
  ): Promise<CompressionResult> {
    return this.compress(messages, events, sessionId, iteration, CompressionTrigger.MANUAL);
  }
  
  /**
   * Get compression statistics
   * @returns Compression statistics
   */
  getCompressionStats(): {
    totalCompressions: number;
    averageCompressionRatio: number;
    totalTokensSaved: number;
    averageCompressionTime: number;
    strategyUsage: Record<string, number>;
  } {
    if (this.compressionHistory.length === 0) {
      return {
        totalCompressions: 0,
        averageCompressionRatio: 0,
        totalTokensSaved: 0,
        averageCompressionTime: 0,
        strategyUsage: {},
      };
    }
    
    const totalCompressions = this.compressionHistory.length;
    const totalCompressionRatio = this.compressionHistory.reduce(
      (sum, event) => sum + event.stats.compressionRatio,
      0
    );
    const totalTokensSaved = this.compressionHistory.reduce(
      (sum, event) => sum + (event.stats.originalTokens - event.stats.compressedTokens),
      0
    );
    const totalCompressionTime = this.compressionHistory.reduce(
      (sum, event) => sum + event.stats.compressionTimeMs,
      0
    );
    
    const strategyUsage: Record<string, number> = {};
    for (const event of this.compressionHistory) {
      strategyUsage[event.stats.strategy] = (strategyUsage[event.stats.strategy] || 0) + 1;
    }
    
    return {
      totalCompressions,
      averageCompressionRatio: totalCompressionRatio / totalCompressions,
      totalTokensSaved,
      averageCompressionTime: totalCompressionTime / totalCompressions,
      strategyUsage,
    };
  }
  
  /**
   * Get compression history
   * @returns Array of compression events
   */
  getCompressionHistory(): CompressionEvent[] {
    return [...this.compressionHistory];
  }
  
  /**
   * Clear compression history
   */
  clearHistory(): void {
    this.compressionHistory = [];
    this.compressionCount = 0;
    this.logger.debug('Cleared compression history');
  }
  
  /**
   * Get current configuration
   * @returns Current compression configuration
   */
  getConfig(): ContextCompressionConfig {
    return { ...this.config };
  }
  
  /**
   * Get current strategy
   * @returns Current compression strategy
   */
  getStrategy(): ContextCompressionStrategy {
    return this.strategy;
  }
  
  /**
   * Get token counter
   * @returns Current token counter
   */
  getTokenCounter(): TokenCounter {
    return this.tokenCounter;
  }
  
  /**
   * Estimate current token usage
   * @param messages Messages to count
   * @returns Estimated token count
   */
  async estimateTokens(messages: ChatCompletionMessageParam[]): Promise<number> {
    return this.tokenCounter.countTokens(messages);
  }
  
  /**
   * Get context window information
   * @returns Context window size and usage information
   */
  async getContextInfo(messages: ChatCompletionMessageParam[]): Promise<{
    currentTokens: number;
    maxTokens: number;
    usagePercentage: number;
    compressionThreshold: number;
    needsCompression: boolean;
  }> {
    const currentTokens = await this.tokenCounter.countTokens(messages);
    const maxTokens = this.tokenCounter.getContextWindow();
    const usagePercentage = currentTokens / maxTokens;
    const compressionThreshold = this.config.compressionThreshold;
    const needsCompression = usagePercentage >= compressionThreshold;
    
    return {
      currentTokens,
      maxTokens,
      usagePercentage,
      compressionThreshold,
      needsCompression,
    };
  }
}
