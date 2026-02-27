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
 * Configuration for sliding window compression strategy
 */
export interface SlidingWindowConfig {
  /** Percentage of messages to preserve (0-1) */
  preserveRatio: number;
  
  /** Always preserve the system message */
  preserveSystemMessage: boolean;
  
  /** Always preserve recent user messages count */
  preserveRecentUserMessages: number;
  
  /** Always preserve recent assistant messages count */
  preserveRecentAssistantMessages: number;
}

/**
 * Sliding Window Compression Strategy
 * 
 * Inspired by Gemini CLI's approach with 70% compression threshold and 30% preservation.
 * This strategy keeps the most recent messages and discards older ones to maintain
 * context window limits while preserving conversation continuity.
 * 
 * Key features:
 * - Preserves system messages
 * - Keeps recent conversation turns
 * - Maintains user-assistant pairs
 * - Simple and predictable behavior
 */
export class SlidingWindowStrategy implements ContextCompressionStrategy {
  readonly name = 'sliding_window';
  readonly description = 'Keeps recent messages and discards older ones (sliding window approach)';
  
  private logger = getLogger('SlidingWindowStrategy');
  private config: SlidingWindowConfig;
  
  constructor(config: Partial<SlidingWindowConfig> = {}) {
    this.config = {
      preserveRatio: 0.3, // Keep 30% of messages
      preserveSystemMessage: true,
      preserveRecentUserMessages: 3,
      preserveRecentAssistantMessages: 3,
      ...config,
    };
  }
  
  shouldCompress(context: CompressionContext): boolean {
    const threshold = context.maxTokens * 0.7; // 70% threshold like Gemini CLI
    const shouldCompress = context.currentTokens >= threshold;
    
    if (shouldCompress) {
      this.logger.info(
        `Compression triggered: ${context.currentTokens} tokens >= ${threshold} threshold (70% of ${context.maxTokens})`
      );
    }
    
    return shouldCompress;
  }
  
  async compress(context: CompressionContext): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalMessages = context.messages;
    const originalTokens = context.currentTokens;
    
    this.logger.info(
      `Starting sliding window compression: ${originalMessages.length} messages, ${originalTokens} tokens`
    );
    
    // Step 1: Identify messages to preserve
    const preservedMessages = this.selectMessagesToPreserve(originalMessages);
    
    // Step 2: Compress events accordingly
    const compressedEvents = this.compressEvents(context.events, preservedMessages);
    
    // Step 3: Calculate estimated tokens (simplified)
    const estimatedTokens = Math.ceil(originalTokens * this.config.preserveRatio);
    
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
      `Sliding window compression completed: ${preservedMessages.length} messages (${stats.compressionRatio.toFixed(2)} compression ratio)`
    );
    
    return {
      messages: preservedMessages,
      events: compressedEvents,
      estimatedTokens,
      stats,
      metadata: {
        strategy: this.name,
        config: this.config,
      },
    };
  }
  
  /**
   * Select which messages to preserve based on the sliding window strategy
   */
  private selectMessagesToPreserve(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
    if (messages.length === 0) return [];
    
    const preserved: ChatCompletionMessageParam[] = [];
    
    // Step 1: Always preserve system messages if configured
    const systemMessages = messages.filter(msg => msg.role === 'system');
    if (this.config.preserveSystemMessage) {
      preserved.push(...systemMessages);
    }
    
    // Step 2: Calculate how many conversation messages to keep
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    // If we have very few messages, don't compress much
    if (nonSystemMessages.length <= 4) {
      preserved.push(...nonSystemMessages);
      return preserved;
    }
    
    const targetCount = Math.max(
      Math.ceil(nonSystemMessages.length * this.config.preserveRatio),
      this.config.preserveRecentUserMessages + this.config.preserveRecentAssistantMessages
    );
    
    // Ensure we actually compress something
    const actualTargetCount = Math.min(targetCount, nonSystemMessages.length - 1);
    
    // Step 3: Take the most recent conversation messages
    const recentMessages = nonSystemMessages.slice(-actualTargetCount);
    
    // Step 4: Ensure we preserve complete conversation turns
    const balancedMessages = this.balanceConversationTurns(recentMessages);
    
    preserved.push(...balancedMessages);
    
    return preserved;
  }
  
  /**
   * Balance conversation turns to avoid orphaned messages
   */
  private balanceConversationTurns(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
    if (messages.length === 0) return [];
    
    const balanced: ChatCompletionMessageParam[] = [];
    
    // Find the first user message to start a complete turn
    let startIndex = 0;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        startIndex = i;
        break;
      }
    }
    
    // Add messages from the first complete turn onwards
    balanced.push(...messages.slice(startIndex));
    
    return balanced;
  }
  
  /**
   * Compress events to match the compressed messages
   */
  private compressEvents(
    events: AgentEventStream.Event[],
    preservedMessages: ChatCompletionMessageParam[]
  ): AgentEventStream.Event[] {
    // For sliding window, we keep events that correspond to preserved messages
    // This is a simplified approach - in practice, we'd need more sophisticated event mapping
    
    const totalEvents = events.length;
    const preserveRatio = this.config.preserveRatio;
    const eventsToKeep = Math.ceil(totalEvents * preserveRatio);
    
    // Keep the most recent events
    return events.slice(-eventsToKeep);
  }
}
