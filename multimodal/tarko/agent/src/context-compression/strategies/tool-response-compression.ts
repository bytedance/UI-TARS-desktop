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
 * Configuration for tool response compression strategy
 */
export interface ToolResponseCompressionConfig {
  /** Maximum length for compressed tool responses */
  maxToolResponseLength: number;
  
  /** Whether to preserve error messages in full */
  preserveErrors: boolean;
  
  /** Whether to preserve successful file operations */
  preserveFileOperations: boolean;
  
  /** List of tool names to never compress */
  neverCompressTools: string[];
  
  /** Compression ratio for large tool responses */
  compressionRatio: number;
}

/**
 * Tool Response Compression Strategy
 * 
 * Inspired by Manus's approach of externalizing large content.
 * This strategy specifically targets large tool responses that can
 * consume significant context space, such as file contents, API responses,
 * or command outputs.
 * 
 * Key features:
 * - Compresses large tool responses while preserving metadata
 * - Keeps error messages and important operation results
 * - Maintains references for potential recovery
 * - Preserves tool call structure
 */
export class ToolResponseCompressionStrategy implements ContextCompressionStrategy {
  readonly name = 'tool_response_compression';
  readonly description = 'Compresses large tool responses while preserving metadata and structure';
  
  private logger = getLogger('ToolResponseCompressionStrategy');
  private config: ToolResponseCompressionConfig;
  
  constructor(config: Partial<ToolResponseCompressionConfig> = {}) {
    this.config = {
      maxToolResponseLength: 500, // Compress responses longer than 500 chars
      preserveErrors: true,
      preserveFileOperations: true,
      neverCompressTools: ['error', 'system'], // Never compress error/system tools
      compressionRatio: 0.2, // Keep 20% of original response
      ...config,
    };
  }
  
  shouldCompress(context: CompressionContext): boolean {
    // This strategy is more conservative, triggers at 80%
    const threshold = context.maxTokens * 0.8;
    const shouldCompress = context.currentTokens >= threshold;
    
    if (shouldCompress) {
      this.logger.info(
        `Tool response compression triggered: ${context.currentTokens} tokens >= ${threshold} threshold (80% of ${context.maxTokens})`
      );
    }
    
    return shouldCompress;
  }
  
  async compress(context: CompressionContext): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalMessages = context.messages;
    const originalTokens = context.currentTokens;
    
    this.logger.info(
      `Starting tool response compression: ${originalMessages.length} messages, ${originalTokens} tokens`
    );
    
    // Step 1: Identify and compress tool responses
    const compressedMessages = await this.compressToolResponses(originalMessages);
    
    // Step 2: Compress corresponding events
    const compressedEvents = await this.compressToolEvents(context.events);
    
    // Step 3: Estimate token savings
    const estimatedTokens = this.estimateTokenSavings(originalTokens, originalMessages, compressedMessages);
    
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
      `Tool response compression completed: ${compressedMessages.length} messages (${stats.compressionRatio.toFixed(2)} compression ratio)`
    );
    
    return {
      messages: compressedMessages,
      events: compressedEvents,
      estimatedTokens,
      stats,
      metadata: {
        strategy: this.name,
        config: this.config,
        compressedToolResponses: true,
      },
    };
  }
  
  /**
   * Compress tool responses in messages
   */
  private async compressToolResponses(messages: ChatCompletionMessageParam[]): Promise<ChatCompletionMessageParam[]> {
    const compressedMessages: ChatCompletionMessageParam[] = [];
    
    for (const message of messages) {
      if (message.role === 'tool') {
        const compressedMessage = this.compressToolMessage(message as any);
        compressedMessages.push(compressedMessage);
      } else {
        compressedMessages.push(message);
      }
    }
    
    return compressedMessages;
  }
  
  /**
   * Compress a single tool message
   */
  private compressToolMessage(message: any): ChatCompletionMessageParam {
    const toolCallId = message.tool_call_id;
    const content = message.content;
    
    // Skip compression for certain conditions
    if (this.shouldSkipCompression(message)) {
      return message;
    }
    
    if (typeof content === 'string' && content.length > this.config.maxToolResponseLength) {
      const compressedContent = this.compressStringContent(content, toolCallId);
      return {
        ...message,
        content: compressedContent,
      };
    }
    
    return message;
  }
  
  /**
   * Check if a tool message should skip compression
   */
  private shouldSkipCompression(message: any): boolean {
    // Preserve error messages
    if (this.config.preserveErrors && this.isErrorMessage(message)) {
      return true;
    }
    
    // Check never-compress tools list
    const toolName = this.extractToolName(message);
    if (toolName && this.config.neverCompressTools.includes(toolName)) {
      return true;
    }
    
    // Preserve file operations if configured
    if (this.config.preserveFileOperations && this.isFileOperation(message)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if message is an error message
   */
  private isErrorMessage(message: any): boolean {
    const content = message.content || '';
    const errorKeywords = ['error', 'failed', 'exception', 'traceback', 'stderr'];
    return errorKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if message is a file operation
   */
  private isFileOperation(message: any): boolean {
    const toolName = this.extractToolName(message);
    const fileTools = ['write_file', 'read_file', 'create_file', 'delete_file'];
    return toolName ? fileTools.includes(toolName) : false;
  }
  
  /**
   * Extract tool name from message (simplified)
   */
  private extractToolName(message: any): string | null {
    // This would need to be implemented based on how tool names are stored
    // For now, return null as we don't have access to the tool name in the message
    return null;
  }
  
  /**
   * Compress string content
   */
  private compressStringContent(content: string, toolCallId?: string): string {
    const maxLength = this.config.maxToolResponseLength;
    const keepLength = Math.floor(maxLength * this.config.compressionRatio);
    
    if (content.length <= maxLength) {
      return content;
    }
    
    // Take beginning and end of content
    const beginLength = Math.floor(keepLength * 0.7);
    const endLength = keepLength - beginLength;
    
    const beginning = content.substring(0, beginLength);
    const ending = content.substring(content.length - endLength);
    const omittedLength = content.length - keepLength;
    
    return `${beginning}\n\n[... ${omittedLength} characters omitted for context compression ...]\n\n${ending}`;
  }
  
  /**
   * Compress tool events
   */
  private async compressToolEvents(events: AgentEventStream.Event[]): Promise<AgentEventStream.Event[]> {
    const compressedEvents: AgentEventStream.Event[] = [];
    
    for (const event of events) {
      if (event.type === 'tool_result') {
        const compressedEvent = this.compressToolResultEvent(event as AgentEventStream.ToolResultEvent);
        compressedEvents.push(compressedEvent);
      } else {
        compressedEvents.push(event);
      }
    }
    
    return compressedEvents;
  }
  
  /**
   * Compress a tool result event
   */
  private compressToolResultEvent(event: AgentEventStream.ToolResultEvent): AgentEventStream.ToolResultEvent {
    const content = event.content;
    
    // Skip compression for certain tools
    if (this.config.neverCompressTools.includes(event.name)) {
      return event;
    }
    
    if (typeof content === 'string' && content.length > this.config.maxToolResponseLength) {
      const compressedContent = this.compressStringContent(content, event.toolCallId);
      return {
        ...event,
        content: compressedContent,
      };
    }
    
    return event;
  }
  
  /**
   * Estimate token savings from compression
   */
  private estimateTokenSavings(
    originalTokens: number,
    originalMessages: ChatCompletionMessageParam[],
    compressedMessages: ChatCompletionMessageParam[]
  ): number {
    // Simple estimation: assume tool responses account for 30% of tokens
    // and we compressed them by the configured ratio
    const toolResponseTokenRatio = 0.3;
    const toolTokens = originalTokens * toolResponseTokenRatio;
    const savedTokens = toolTokens * (1 - this.config.compressionRatio);
    
    return Math.ceil(originalTokens - savedTokens);
  }
}
