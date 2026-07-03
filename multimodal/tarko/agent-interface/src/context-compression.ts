/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from './agent-event-stream';

/**
 * Context compression level determines the aggressiveness of compression
 */
export type ContextCompressionLevel = 'none' | 'conservative' | 'moderate' | 'aggressive';

/**
 * Compression statistics and metadata
 */
export interface CompressionStats {
  /** Original token count before compression */
  originalTokens: number;
  /** Token count after compression */
  compressedTokens: number;
  /** Compression ratio (compressedTokens / originalTokens) */
  compressionRatio: number;
  /** Number of messages before compression */
  originalMessageCount: number;
  /** Number of messages after compression */
  compressedMessageCount: number;
  /** Number of images before compression */
  originalImageCount: number;
  /** Number of images after compression */
  compressedImageCount: number;
  /** Applied compression strategies */
  appliedStrategies: string[];
}

/**
 * Context compression result
 */
export interface CompressionResult {
  /** Compressed messages */
  messages: ChatCompletionMessageParam[];
  /** Compression statistics */
  stats: CompressionStats;
  /** Whether compression was applied */
  wasCompressed: boolean;
}

/**
 * Context for compression decision making
 */
export interface CompressionContext {
  /** Current token count estimate */
  currentTokens: number;
  /** Maximum allowed tokens */
  maxTokens: number;
  /** Current iteration number */
  iteration: number;
  /** Session ID for context */
  sessionId: string;
  /** Original event stream for reference */
  events: AgentEventStream.Event[];
}

/**
 * Base interface for context compression strategies
 */
export interface ContextCompressionStrategy {
  /** Strategy name for identification */
  readonly name: string;
  
  /** Strategy description */
  readonly description: string;
  
  /**
   * Check if compression should be applied given the current context
   * @param context Current compression context
   * @returns True if compression should be applied
   */
  shouldCompress(context: CompressionContext): boolean;
  
  /**
   * Apply compression to the message history
   * @param messages Original message history
   * @param context Compression context
   * @returns Compression result with compressed messages and stats
   */
  compress(
    messages: ChatCompletionMessageParam[],
    context: CompressionContext
  ): Promise<CompressionResult> | CompressionResult;
}

/**
 * Configuration for context compression
 */
export interface ContextCompressionOptions {
  /**
   * Enable or disable context compression
   * @defaultValue true
   */
  enabled?: boolean;
  
  /**
   * Maximum context window size in tokens
   * When not specified, uses model's default context window
   */
  maxContextTokens?: number;
  
  /**
   * Compression level - determines which strategies to apply
   * @defaultValue 'moderate'
   */
  level?: ContextCompressionLevel;
  
  /**
   * Custom compression strategies to use instead of built-in ones
   * When provided, built-in strategies for the specified level are ignored
   */
  customStrategies?: ContextCompressionStrategy[];
  
  /**
   * Token threshold ratio to trigger compression (0.0 to 1.0)
   * Compression triggers when currentTokens/maxTokens >= threshold
   * @defaultValue 0.8
   */
  compressionThreshold?: number;
  
  /**
   * Target compression ratio (0.0 to 1.0)
   * Aims to reduce context to this ratio of maxContextTokens
   * @defaultValue 0.6
   */
  targetCompressionRatio?: number;
  
  /**
   * Maximum number of images to keep in context
   * @defaultValue 5
   */
  maxImages?: number;
  
  /**
   * Maximum number of tool results to keep in context
   * @defaultValue 10
   */
  maxToolResults?: number;
  
  /**
   * Whether to preserve the most recent messages
   * @defaultValue true
   */
  preserveRecent?: boolean;
  
  /**
   * Number of recent messages to always preserve
   * @defaultValue 3
   */
  recentMessageCount?: number;
}

/**
 * Token estimation interface for different content types
 */
export interface TokenEstimator {
  /**
   * Estimate tokens for text content
   * @param text Text content to estimate
   * @returns Estimated token count
   */
  estimateTextTokens(text: string): number;
  
  /**
   * Estimate tokens for image content
   * @param imageData Image data or metadata
   * @returns Estimated token count
   */
  estimateImageTokens(imageData: any): number;
  
  /**
   * Estimate tokens for a complete message
   * @param message Chat completion message
   * @returns Estimated token count
   */
  estimateMessageTokens(message: ChatCompletionMessageParam): number;
  
  /**
   * Estimate tokens for message array
   * @param messages Array of messages
   * @returns Estimated token count
   */
  estimateMessagesTokens(messages: ChatCompletionMessageParam[]): number;
}
