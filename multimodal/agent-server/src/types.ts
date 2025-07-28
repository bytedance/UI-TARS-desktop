/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export * from '@agent-tars/interface';

/**
 * Agent constructor type for dependency injection
 */
export type AgentConstructor<T extends IAgent = IAgent> = new (options: any) => T;

/**
 * Agent Server configuration options
 */
export interface AgentServerOptions {
  /**
   * Agent constructor for dependency injection
   * Allows using any Agent implementation that follows the IAgent interface
   */
  agentConstructor: AgentConstructor;

  /**
   * Agent configuration options
   * Will be passed to the injected Agent constructor
   */
  agentOptions: any;
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
