/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextCompressionStrategy,
  CompressionContext,
  CompressionResult,
  CompressionStats,
} from '../types';
import { getLogger } from '@tarko/shared-utils';
import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';

/**
 * Configuration for smart truncation compression strategy
 */
export interface SmartTruncationConfig {
  /** Preserve system messages */
  preserveSystemMessages: boolean;
  
  /** Preserve user messages */
  preserveUserMessages: boolean;
  
  /** Number of recent conversation turns to always preserve */
  preserveRecentTurns: number;
  
  /** Maximum number of tool calls to preserve */
  maxToolCallsToPreserve: number;
  
  /** Preserve important tool types */
  importantToolTypes: string[];
}

/**
 * Smart Truncation Compression Strategy
 * 
 * A hybrid approach that intelligently selects which messages to preserve
 * based on their importance and recency. This strategy balances between
 * preserving important context and maintaining reasonable token counts.
 * 
 * Key features:
 * - Preserves critical message types (system, user, errors)
 * - Maintains recent conversation context
 * - Keeps important tool interactions
 * - Uses intelligent scoring for message importance
 */
export class SmartTruncationStrategy implements ContextCompressionStrategy {
  readonly name = 'smart_truncation';
  readonly description = 'Intelligently selects important messages to preserve while removing less critical content';
  
  private logger = getLogger('SmartTruncationStrategy');
  private config: SmartTruncationConfig;
  
  constructor(config: Partial<SmartTruncationConfig> = {}) {
    this.config = {
      preserveSystemMessages: true,
      preserveUserMessages: true,
      preserveRecentTurns: 5,
      maxToolCallsToPreserve: 10,
      importantToolTypes: ['error', 'file_read', 'file_write', 'search', 'analysis'],
      ...config,
    };
  }
  
  shouldCompress(context: CompressionContext): boolean {
    // Trigger at 75% - balanced approach
    const threshold = context.maxTokens * 0.75;
    const shouldCompress = context.currentTokens >= threshold;
    
    if (shouldCompress) {
      this.logger.info(
        `Smart truncation triggered: ${context.currentTokens} tokens >= ${threshold} threshold (75% of ${context.maxTokens})`
      );
    }
    
    return shouldCompress;
  }
  
  async compress(context: CompressionContext): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalMessages = context.messages;
    const originalTokens = context.currentTokens;
    
    this.logger.info(
      `Starting smart truncation compression: ${originalMessages.length} messages, ${originalTokens} tokens`
    );
    
    // Step 1: Score all messages by importance
    const scoredMessages = this.scoreMessages(originalMessages, context);
    
    // Step 2: Select messages to preserve based on scores and rules
    const preservedMessages = this.selectMessagesToPreserve(scoredMessages, context);
    
    // Step 3: Compress events accordingly
    const compressedEvents = this.compressEvents(context.events, preservedMessages);
    
    // Step 4: Estimate token count
    const estimatedTokens = this.estimateTokens(preservedMessages, originalTokens, originalMessages.length);
    
    const compressionTimeMs = Date.now() - startTime;
    
    const stats: CompressionStats = {
      originalTokens,
      compressedTokens: estimatedTokens,
      compressionRatio: 1 - (estimatedTokens / originalTokens),
      originalMessageCount: originalMessages.length,
      compressedMessageCount: preservedMessages.length,
      compressionTimeMs,
      strategy: this.name,
    };
    
    this.logger.info(
      `Smart truncation completed: ${preservedMessages.length} messages (${stats.compressionRatio.toFixed(2)} compression ratio)`
    );
    
    return {
      messages: preservedMessages,
      events: compressedEvents,
      estimatedTokens,
      stats,
      metadata: {
        strategy: this.name,
        config: this.config,
        intelligentSelection: true,
      },
    };
  }
  
  /**
   * Score messages by importance
   */
  private scoreMessages(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): Array<{ message: ChatCompletionMessageParam; score: number; index: number }> {
    return messages.map((message, index) => ({
      message,
      score: this.calculateMessageScore(message, index, messages.length, context),
      index,
    }));
  }
  
  /**
   * Calculate importance score for a message
   */
  private calculateMessageScore(
    message: ChatCompletionMessageParam,
    index: number,
    totalMessages: number,
    context: CompressionContext
  ): number {
    let score = 0;
    
    // Base score by role
    switch (message.role) {
      case 'system':
        score += 100; // Highest priority
        break;
      case 'user':
        score += 80; // High priority
        break;
      case 'assistant':
        score += 60; // Medium priority
        break;
      case 'tool':
        score += this.calculateToolScore(message as any);
        break;
      default:
        score += 20;
    }
    
    // Recency bonus (more recent = higher score)
    const recencyRatio = index / totalMessages;
    score += recencyRatio * 50;
    
    // Recent turns bonus
    const recentTurnThreshold = totalMessages - (this.config.preserveRecentTurns * 2);
    if (index >= recentTurnThreshold) {
      score += 30;
    }
    
    // Content length penalty (very long messages get lower priority)
    const contentLength = this.getContentLength(message);
    if (contentLength > 2000) {
      score -= 20;
    } else if (contentLength > 1000) {
      score -= 10;
    }
    
    // Error message bonus
    if (this.containsError(message)) {
      score += 40;
    }
    
    return score;
  }
  
  /**
   * Calculate score for tool messages
   */
  private calculateToolScore(message: any): number {
    let score = 40; // Base tool score
    
    // Check if it's an important tool type
    const content = message.content || '';
    for (const toolType of this.config.importantToolTypes) {
      if (content.toLowerCase().includes(toolType)) {
        score += 20;
        break;
      }
    }
    
    // Error responses get higher priority
    if (this.containsError(message)) {
      score += 30;
    }
    
    return score;
  }
  
  /**
   * Get content length of a message
   */
  private getContentLength(message: ChatCompletionMessageParam): number {
    if (typeof message.content === 'string') {
      return message.content.length;
    } else if (Array.isArray(message.content)) {
      return message.content.reduce((total, part) => {
        if (part.type === 'text') {
          return total + (part as any).text.length;
        }
        return total + 100; // Estimate for non-text content
      }, 0);
    }
    return 0;
  }
  
  /**
   * Check if message contains error information
   */
  private containsError(message: ChatCompletionMessageParam): boolean {
    const content = this.getMessageText(message);
    const errorKeywords = ['error', 'failed', 'exception', 'traceback', 'stderr', 'warning'];
    return errorKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Extract text content from message
   */
  private getMessageText(message: ChatCompletionMessageParam): string {
    if (typeof message.content === 'string') {
      return message.content;
    } else if (Array.isArray(message.content)) {
      return message.content
        .filter(part => part.type === 'text')
        .map(part => (part as any).text)
        .join(' ');
    }
    return '';
  }
  
  /**
   * Select messages to preserve based on scores and rules
   */
  private selectMessagesToPreserve(
    scoredMessages: Array<{ message: ChatCompletionMessageParam; score: number; index: number }>,
    context: CompressionContext
  ): ChatCompletionMessageParam[] {
    const preserved: ChatCompletionMessageParam[] = [];
    const targetTokens = context.maxTokens * 0.5; // Target 50% of max tokens
    let currentTokens = 0;
    
    // Sort by score (highest first)
    const sortedMessages = [...scoredMessages].sort((a, b) => b.score - a.score);
    
    // Always preserve system messages
    if (this.config.preserveSystemMessages) {
      for (const { message } of sortedMessages) {
        if (message.role === 'system') {
          preserved.push(message);
          currentTokens += this.estimateMessageTokens(message);
        }
      }
    }
    
    // Always preserve user messages if configured
    if (this.config.preserveUserMessages) {
      for (const { message } of sortedMessages) {
        if (message.role === 'user' && !preserved.includes(message)) {
          const messageTokens = this.estimateMessageTokens(message);
          if (currentTokens + messageTokens <= targetTokens) {
            preserved.push(message);
            currentTokens += messageTokens;
          }
        }
      }
    }
    
    // Add other high-scoring messages until we reach target
    for (const { message } of sortedMessages) {
      if (!preserved.includes(message)) {
        const messageTokens = this.estimateMessageTokens(message);
        if (currentTokens + messageTokens <= targetTokens) {
          preserved.push(message);
          currentTokens += messageTokens;
        }
      }
    }
    
    // Sort preserved messages by original order
    return preserved.sort((a, b) => {
      const indexA = scoredMessages.find(sm => sm.message === a)?.index ?? 0;
      const indexB = scoredMessages.find(sm => sm.message === b)?.index ?? 0;
      return indexA - indexB;
    });
  }
  
  /**
   * Estimate tokens for a single message
   */
  private estimateMessageTokens(message: ChatCompletionMessageParam): number {
    const contentLength = this.getContentLength(message);
    return Math.ceil(contentLength * 0.25); // Rough estimate: 4 chars per token
  }
  
  /**
   * Estimate total tokens for messages
   */
  private estimateTokens(
    messages: ChatCompletionMessageParam[],
    originalTokens: number,
    originalMessageCount: number
  ): number {
    // Simple ratio-based estimation
    const ratio = messages.length / originalMessageCount;
    return Math.ceil(originalTokens * ratio);
  }
  
  /**
   * Compress events to match preserved messages
   */
  private compressEvents(
    events: AgentEventStream.Event[],
    preservedMessages: ChatCompletionMessageParam[]
  ): AgentEventStream.Event[] {
    // For smart truncation, preserve events that correspond to preserved messages
    // This is a simplified approach
    const preserveRatio = preservedMessages.length / events.length;
    const eventsToKeep = Math.ceil(events.length * Math.min(preserveRatio, 0.5));
    
    return events.slice(-eventsToKeep);
  }
}
