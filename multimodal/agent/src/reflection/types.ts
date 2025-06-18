/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, LoopTerminationCheckResult } from '@multimodal/agent-interface';

/**
 * Reflection request parameters
 */
export interface ReflectionRequest {
  /**
   * The unique session identifier
   */
  sessionId: string;

  /**
   * The final assistant message that would terminate the loop
   */
  assistantMessage: AgentEventStream.AssistantMessageEvent;

  /**
   * The most recent user message(s) from the event stream
   */
  userMessages: AgentEventStream.UserMessageEvent[];

  /**
   * Optional abort signal to cancel the reflection request
   */
  abortSignal?: AbortSignal;
}

/**
 * Result of the reflection process
 */
export interface ReflectionResult extends LoopTerminationCheckResult {
  /**
   * Optional analysis explaining the reflection decision
   */
  analysis?: string;
}
