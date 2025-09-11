/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Error with additional code information
 */
export interface ErrorWithCode extends Error {
  code?: string;
  details?: Record<string, any>;
}

/**
 * Standardized error response structure
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Error response structure for agent errors
 */
export interface AgentErrorResponse {
  success: false;
  error: ErrorResponse;
}

/**
 * Handle agent errors and convert them to standardized error responses
 * @param error The error to handle
 * @returns Standardized error response
 */
export function handleAgentError(error: any): ErrorResponse {
  if (error instanceof Error) {
    const errorWithCode = error as ErrorWithCode;
    return {
      code: errorWithCode.code || 'AGENT_ERROR',
      message: errorWithCode.message,
      details: errorWithCode.details,
    };
  }

  if (typeof error === 'string') {
    return {
      code: 'AGENT_ERROR',
      message: error,
    };
  }

  if (error && typeof error === 'object') {
    return {
      code: error.code || 'AGENT_ERROR',
      message: error.message || 'Unknown error occurred',
      details: error.details,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
  };
}

/**
 * Create a standardized error response
 * @param error The error to convert
 * @returns Error response object
 */
export function createErrorResponse(error: any): AgentErrorResponse {
  return { success: false, error: handleAgentError(error) };
}
