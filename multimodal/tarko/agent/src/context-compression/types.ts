/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatCompletionMessageParam } from '@tarko/model-provider/types';
import { AgentEventStream } from '@tarko/agent-interface';

/**
 * Context compression strategy interface
 * Implementations can provide different compression approaches
 */
export interface ContextCompressionStrategy {
  /** Unique identifier for this strategy */
  readonly name: string;

  /** Human-readable description of the strategy */
  readonly description: string;

  /**
   * Check if compression should be triggered
   * @param context Current context information
   * @returns true if compression should be performed
   */
  shouldCompress(context: CompressionContext): boolean;

  /**
   * Perform the actual compression
   * @param context Current context information
   * @returns Compressed messages or events
   */
  compress(context: CompressionContext): Promise<CompressionResult>;
}

/**
 * Context information provided to compression strategies
 */
export interface CompressionContext {
  /** Current message history */
  messages: ChatCompletionMessageParam[];

  /** Current event stream events */
  events: AgentEventStream.Event[];

  /** Current token count */
  currentTokens: number;

  /** Maximum allowed tokens */
  maxTokens: number;

  /** Current model information */
  model: {
    id: string;
    provider: string;
    contextWindow: number;
  };

  /** Session information */
  session: {
    id: string;
    iteration: number;
  };

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Result of compression operation
 */
export interface CompressionResult {
  /** Compressed messages */
  messages: ChatCompletionMessageParam[];

  /** Compressed events (optional) */
  events?: AgentEventStream.Event[];

  /** Estimated token count after compression */
  estimatedTokens: number;

  /** Compression statistics */
  stats: CompressionStats;

  /** Additional metadata about the compression */
  metadata?: Record<string, any>;
}

/**
 * Statistics about compression operation
 */
export interface CompressionStats {
  /** Original token count */
  originalTokens: number;

  /** Token count after compression */
  compressedTokens: number;

  /** Compression ratio (0-1, where 0 = no compression, 1 = full compression) */
  compressionRatio: number;

  /** Number of messages before compression */
  originalMessageCount: number;

  /** Number of messages after compression */
  compressedMessageCount: number;

  /** Time taken for compression in milliseconds */
  compressionTimeMs: number;

  /** Strategy used for compression */
  strategy: string;
}

/**
 * Configuration for context compression
 */
export interface ContextCompressionConfig {
  /** Whether compression is enabled */
  enabled: boolean;

  /** Compression strategy to use */
  strategy: ContextCompressionStrategy | string;

  /** Threshold for triggering compression (0-1, percentage of context window) */
  compressionThreshold: number;

  /** Target size after compression (0-1, percentage of context window) */
  targetCompressionRatio: number;

  /** Minimum number of messages to preserve */
  minMessagesToKeep: number;

  /** Maximum number of compression attempts per session */
  maxCompressionAttempts: number;

  /** Custom configuration for specific strategies */
  strategyConfig?: Record<string, any>;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: ContextCompressionConfig = {
  enabled: true,
  strategy: 'sliding_window',
  compressionThreshold: 0.7, // Trigger at 70% of context window
  targetCompressionRatio: 0.3, // Compress to 30% of original size
  minMessagesToKeep: 5, // Always keep at least 5 recent messages
  maxCompressionAttempts: 10, // Maximum 10 compressions per session
  strategyConfig: {},
};

/**
 * Compression trigger reasons
 */
export enum CompressionTrigger {
  /** Triggered by token count threshold */
  TOKEN_THRESHOLD = 'token_threshold',
  /** Triggered manually */
  MANUAL = 'manual',
  /** Triggered by iteration count */
  ITERATION_COUNT = 'iteration_count',
  /** Triggered by time-based policy */
  TIME_BASED = 'time_based',
}

/**
 * Compression event for tracking
 */
export interface CompressionEvent {
  /** When the compression occurred */
  timestamp: number;

  /** What triggered the compression */
  trigger: CompressionTrigger;

  /** Compression statistics */
  stats: CompressionStats;

  /** Session information */
  sessionId: string;

  /** Iteration when compression occurred */
  iteration: number;
}
