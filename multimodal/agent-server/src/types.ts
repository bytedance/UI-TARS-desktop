/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { IAgent, AgentOptions } from '@multimodal/agent-interface';

export * from '@multimodal/agent-interface';
export * from '@multimodal/agent-server-interface';

/**
 * Agent constructor type for dependency injection
 */
export type AgentConstructor<
  T extends IAgent = IAgent,
  U extends AgentOptions = AgentOptions,
> = new (options: U) => T;

/**
 * Agent Server configuration options
 */
export interface AgentServerOptions<
  T extends IAgent = IAgent,
  U extends AgentOptions = AgentOptions,
> {
  /**
   * Agent constructor for dependency injection
   * Allows using any Agent implementation that follows the IAgent interface
   */
  agentConstructor: AgentConstructor<T, U>;

  /**
   * Agent configuration options
   * Will be passed to the injected Agent constructor
   */
  agentOptions: U;
}

/**
 * API response structure for errors
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * API response structure for success with data
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Session status response
 */
export interface SessionStatusResponse {
  sessionId: string;
  status: {
    isProcessing: boolean;
    state: string;
  };
}

/**
 * Browser control information response
 */
export interface BrowserControlInfoResponse {
  mode: string;
  tools: string[];
}

/**
 * Share configuration response
 */
export interface ShareConfigResponse {
  hasShareProvider: boolean;
  shareProvider: string | null;
}

/**
 * Share result response
 */
export interface ShareResultResponse {
  success: boolean;
  url?: string;
  html?: string;
  sessionId?: string;
  error?: string;
}
