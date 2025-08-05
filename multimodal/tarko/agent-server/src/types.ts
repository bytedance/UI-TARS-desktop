/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentAppConfig, AgentServerVersionInfo, GlobalDirectoryOptions } from '@tarko/interface';

export * from '@tarko/interface';

/**
 * Agent Server instantiation configuration
 */
export interface AgentServerInitOptions<T extends AgentAppConfig = AgentAppConfig> {
  /**
   * Agent version info
   */
  versionInfo?: AgentServerVersionInfo;
  /**
   * Global directory configuration
   */
  directories?: GlobalDirectoryOptions;
  /**
   * Agent App configuration
   */
  appConfig: T;
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
