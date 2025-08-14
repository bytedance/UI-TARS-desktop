/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelProviderName } from '@tarko/model-provider/types';
import {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionChunk,
  LLMRequest,
} from '@tarko/model-provider/types';
import { Tool } from './tool';
import { AgentEventStream } from './agent-event-stream';

/**
 * Agent execution status
 */
export enum AgentStatus {
  /** Agent is idle and ready to accept new tasks */
  IDLE = 'idle',
  /** Agent is currently executing a task */
  EXECUTING = 'executing',
  /** Agent execution has been aborted */
  ABORTED = 'aborted',
  /** Agent has encountered an error */
  ERROR = 'error',
}

/**
 * Type for LLM request hook payload - containing all information about the request
 */
export interface LLMRequestHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete request parameters
   */
  request: LLMRequest;
  /**
   * The requested base url
   */
  baseURL?: string;
}

/**
 * Type for LLM response hook payload
 */
export interface LLMResponseHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete model response
   */
  response: ChatCompletion;
}

/**
 * Type for LLM response hook payload - streaming version
 */
export interface LLMStreamingResponseHookPayload {
  /**
   * The model provider name
   */
  provider: string;
  /**
   * The complete stream of chunks
   */
  chunks: ChatCompletionChunk[];
}

/**
 * LLM request for summary generation
 */
export interface SummaryRequest {
  /**
   * The conversation messages to summarize
   */
  messages: ChatCompletionMessageParam[];

  /**
   * The model to use for summarization (optional)
   */
  model?: string;

  /**
   * The provider to use for summarization (optional)
   */
  provider?: ModelProviderName;

  /**
   * Abort signal for canceling the request
   */
  abortSignal?: AbortSignal;
}

/**
 * Summary response from LLM
 */
export interface SummaryResponse {
  /**
   * The generated summary text
   */
  summary: string;

  /**
   * The model used for generating the summary
   */
  model: string;

  /**
   * The provider used for generating the summary
   */
  provider: string;
}

/**
 * Result of loop termination check in onBeforeLoopTermination hook
 * Used to decide whether to finish or continue the agent loop
 */
export interface LoopTerminationCheckResult {
  /**
   * Whether the loop should finish (true) or continue (false)
   */
  finished: boolean;

  /**
   * Optional message explaining why the loop should continue
   * Only used when finished is false
   */
  message?: string;
}

/**
 * Context provided to the onPrepareRequest hook
 */
export interface PrepareRequestContext {
  /** Current system prompt */
  systemPrompt: string;

  /** Current available tools */
  tools: Tool[];

  /** Session identifier for this conversation */
  sessionId: string;

  /** Current iteration number (1-based) */
  iteration: number;
}

/**
 * Result returned from the onPrepareRequest hook
 */
export interface PrepareRequestResult {
  /** Modified system prompt */
  systemPrompt: string;

  /** Modified tools array */
  tools: Tool[];
}

/**
 * Context provided to the onEachAgentLoopEnd hook
 */
export interface EachAgentLoopEndContext {
  /** Session identifier for this conversation */
  sessionId: string;

  /** Current iteration number (1-based) */
  iteration: number;

  /** Whether this iteration produced a final answer (no more tool calls) */
  hasFinalAnswer: boolean;

  /** Whether the loop will continue to next iteration */
  willContinue: boolean;

  /** The assistant message event from this iteration (if any) */
  assistantEvent?: import('./agent-event-stream').AgentEventStream.AssistantMessageEvent;
}
