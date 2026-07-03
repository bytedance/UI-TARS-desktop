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
 * Configuration for structured summary compression strategy
 */
export interface StructuredSummaryConfig {
  /** Number of recent messages to preserve without summarization */
  preserveRecentMessages: number;
  
  /** Whether to use the 8-section structure like Claude Code */
  useEightSectionStructure: boolean;
  
  /** Custom summary sections (if not using 8-section structure) */
  customSections?: string[];
  
  /** Temperature for summary generation */
  summaryTemperature: number;
  
  /** Maximum tokens for summary */
  maxSummaryTokens: number;
}

/**
 * Structured Summary Compression Strategy
 * 
 * Inspired by Claude Code's 8-section structured summarization approach.
 * This strategy creates a structured summary of older conversation while
 * preserving recent messages intact.
 * 
 * Eight-section structure:
 * 1. Primary Request and Intent
 * 2. Key Technical Concepts
 * 3. Files and Code Sections
 * 4. Errors and Fixes
 * 5. Problem Solving
 * 6. All User Messages
 * 7. Pending Tasks
 * 8. Current Work
 */
export class StructuredSummaryStrategy implements ContextCompressionStrategy {
  readonly name = 'structured_summary';
  readonly description = 'Creates structured summaries of older conversation while preserving recent messages';
  
  private logger = getLogger('StructuredSummaryStrategy');
  private config: StructuredSummaryConfig;
  
  constructor(config: Partial<StructuredSummaryConfig> = {}) {
    this.config = {
      preserveRecentMessages: 10, // Keep last 10 messages intact
      useEightSectionStructure: true,
      summaryTemperature: 0.3, // Lower temperature for focused summaries
      maxSummaryTokens: 2000, // Reasonable summary size
      ...config,
    };
  }
  
  shouldCompress(context: CompressionContext): boolean {
    // Trigger at 92% like Claude Code for maximum utilization
    const threshold = context.maxTokens * 0.92;
    const shouldCompress = context.currentTokens >= threshold;
    
    if (shouldCompress) {
      this.logger.info(
        `Compression triggered: ${context.currentTokens} tokens >= ${threshold} threshold (92% of ${context.maxTokens})`
      );
    }
    
    return shouldCompress;
  }
  
  async compress(context: CompressionContext): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalMessages = context.messages;
    const originalTokens = context.currentTokens;
    
    this.logger.info(
      `Starting structured summary compression: ${originalMessages.length} messages, ${originalTokens} tokens`
    );
    
    // Step 1: Split messages into summary and preserve groups
    const { messagesToSummarize, messagesToPreserve } = this.splitMessages(originalMessages);
    
    // Step 2: Generate structured summary
    const summaryMessage = await this.generateStructuredSummary(messagesToSummarize, context);
    
    // Step 3: Combine summary with preserved messages
    const compressedMessages = this.combineMessages(summaryMessage, messagesToPreserve);
    
    // Step 4: Compress events accordingly
    const compressedEvents = this.compressEvents(context.events, messagesToPreserve.length);
    
    // Step 5: Estimate token count
    const estimatedTokens = this.config.maxSummaryTokens + 
      Math.ceil(originalTokens * (messagesToPreserve.length / originalMessages.length));
    
    const compressionTimeMs = Date.now() - startTime;
    
    const stats: CompressionStats = {
      originalTokens,
      compressedTokens: estimatedTokens,
      compressionRatio: 1 - (estimatedTokens / originalTokens),
      originalMessageCount: originalMessages.length,
      compressedMessageCount: compressedMessages.length,
      compressionTimeMs,
      strategy: this.name,
    };
    
    this.logger.info(
      `Structured summary compression completed: ${compressedMessages.length} messages (${stats.compressionRatio.toFixed(2)} compression ratio)`
    );
    
    return {
      messages: compressedMessages,
      events: compressedEvents,
      estimatedTokens,
      stats,
      metadata: {
        strategy: this.name,
        config: this.config,
        summaryGenerated: true,
        sectionsUsed: this.getSectionNames(),
      },
    };
  }
  
  /**
   * Split messages into those to summarize and those to preserve
   */
  private splitMessages(messages: ChatCompletionMessageParam[]): {
    messagesToSummarize: ChatCompletionMessageParam[];
    messagesToPreserve: ChatCompletionMessageParam[];
  } {
    if (messages.length <= this.config.preserveRecentMessages) {
      return {
        messagesToSummarize: [],
        messagesToPreserve: messages,
      };
    }
    
    // Always preserve system messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');
    
    const splitPoint = Math.max(0, nonSystemMessages.length - this.config.preserveRecentMessages);
    
    return {
      messagesToSummarize: nonSystemMessages.slice(0, splitPoint),
      messagesToPreserve: [...systemMessages, ...nonSystemMessages.slice(splitPoint)],
    };
  }
  
  /**
   * Generate structured summary of messages
   */
  private async generateStructuredSummary(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): Promise<ChatCompletionMessageParam | null> {
    if (messages.length === 0) return null;
    
    const sections = this.getSectionNames();
    const summaryPrompt = this.buildSummaryPrompt(sections);
    
    // Convert messages to text for summarization
    const conversationText = this.messagesToText(messages);
    
    // For now, create a simplified summary
    // In a full implementation, this would call an LLM to generate the summary
    const summary = this.createSimplifiedSummary(conversationText, sections);
    
    return {
      role: 'system',
      content: `[CONVERSATION SUMMARY]\n\n${summary}\n\n[END SUMMARY]`,
    };
  }
  
  /**
   * Get section names based on configuration
   */
  private getSectionNames(): string[] {
    if (this.config.useEightSectionStructure) {
      return [
        '1. Primary Request and Intent',
        '2. Key Technical Concepts',
        '3. Files and Code Sections',
        '4. Errors and Fixes',
        '5. Problem Solving',
        '6. All User Messages',
        '7. Pending Tasks',
        '8. Current Work',
      ];
    }
    
    return this.config.customSections || [
      '1. Main Objectives',
      '2. Key Information',
      '3. Important Decisions',
      '4. Current Status',
    ];
  }
  
  /**
   * Build prompt for summary generation
   */
  private buildSummaryPrompt(sections: string[]): string {
    return `Generate a structured summary of the following conversation using these sections:

${sections.join('\n')}

For each section, provide a concise summary of relevant information. If a section is not applicable, write "N/A".

Conversation to summarize:`;
  }
  
  /**
   * Convert messages to text format
   */
  private messagesToText(messages: ChatCompletionMessageParam[]): string {
    return messages.map(msg => {
      let content = '';
      if (typeof msg.content === 'string') {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .filter(part => part.type === 'text')
          .map(part => (part as any).text)
          .join(' ');
      }
      return `${msg.role}: ${content}`;
    }).join('\n\n');
  }
  
  /**
   * Create simplified summary (placeholder for LLM-generated summary)
   */
  private createSimplifiedSummary(conversationText: string, sections: string[]): string {
    // This is a simplified implementation
    // In practice, this would use an LLM to generate a proper structured summary
    
    const lines = conversationText.split('\n').filter(line => line.trim());
    const summary = sections.map(section => {
      return `${section}\nKey points from conversation history.\n`;
    }).join('\n');
    
    return `${summary}\n\nTotal messages summarized: ${lines.length}\nSummary generated at: ${new Date().toISOString()}`;
  }
  
  /**
   * Combine summary with preserved messages
   */
  private combineMessages(
    summaryMessage: ChatCompletionMessageParam | null,
    preservedMessages: ChatCompletionMessageParam[]
  ): ChatCompletionMessageParam[] {
    if (!summaryMessage) return preservedMessages;
    
    // Insert summary after system messages but before conversation
    const systemMessages = preservedMessages.filter(msg => msg.role === 'system');
    const conversationMessages = preservedMessages.filter(msg => msg.role !== 'system');
    
    return [...systemMessages, summaryMessage, ...conversationMessages];
  }
  
  /**
   * Compress events to match the compression
   */
  private compressEvents(
    events: AgentEventStream.Event[],
    preservedMessageCount: number
  ): AgentEventStream.Event[] {
    // Keep recent events that correspond to preserved messages
    const totalEvents = events.length;
    const estimatedEventsToKeep = Math.ceil(totalEvents * 0.3); // Keep 30% of events
    
    return events.slice(-estimatedEventsToKeep);
  }
}
