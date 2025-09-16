/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ErrorWithCode - Extended Error class with error code
 * Provides structured error information for better handling
 */
export class ErrorWithCode extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AgentError';
  }
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
 * Safely handles agent errors to prevent process crashes
 * @param error The error to handle
 * @param context Additional context for logging
 * @returns Normalized error object
 */
export function handleAgentError(error: unknown, context?: string): ErrorWithCode {
  // Log the error with context
  console.error(`Agent error${context ? ` [${context}]` : ''}:`, error);

  // Normalize to ErrorWithCode
  if (error instanceof ErrorWithCode) {
    return error;
  }

  // Create structured error from generic error
  if (error instanceof Error) {
    return new ErrorWithCode(error.message, 'AGENT_EXECUTION_ERROR', { stack: error.stack });
  }

  // Handle non-Error objects
  return new ErrorWithCode(
    typeof error === 'string' ? error : 'Unknown agent execution error',
    'UNKNOWN_ERROR',
    { originalError: error },
  );
}

/**
 * Create a standardized error response
 * @param error The error to convert
 * @returns Error response object
 */
export function createErrorResponse(error: any): AgentErrorResponse {
  return { success: false, error: handleAgentError(error) };
}
