/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent processing phase types for TTFT optimization
 *
 * These phases represent the detailed states an agent goes through during processing,
 * providing granular visibility into the agent's current activity for UI feedback.
 */
export type AgentProcessingPhase =
  /**
   * Initial setup phases - preparing for processing
   */
  | 'initializing' // General initialization state
  | 'query_preparation' // Preparing to process the user's request
  | 'streaming_preparation' // Preparing for streaming response
  | 'model_initialization' // Initializing the model

  /**
   * Processing phases - active work being done
   */
  | 'processing' // General processing state
  | 'request_processing' // Processing the user's request
  | 'warming_up' // Warming up the model
  | 'model_warmup' // Specific model warmup phase

  /**
   * Generation phases - producing content
   */
  | 'generating' // General content generation
  | 'response_generation' // Generating the response
  | 'first_token_received' // First token has been received

  /**
   * Streaming phase - streaming content to the client
   */
  | 'streaming' // Streaming content to the client

  /**
   * Tool execution phase - executing tools
   */
  | 'executing_tools' // General tool execution state
  | 'tool_execution'; // Specific tool execution

/**
 * Agent status interface for detailed status reporting
 */
export interface AgentStatusInfo {
  /** Whether the agent is currently processing a request */
  isProcessing: boolean;

  /** The current high-level state (initializing, processing, etc.) */
  state?: string;

  /** The specific processing phase for TTFT optimization */
  phase?: AgentProcessingPhase;

  /** User-friendly message describing the current status */
  message?: string;

  /** Estimated time range for the current operation */
  estimatedTime?: string;
}
