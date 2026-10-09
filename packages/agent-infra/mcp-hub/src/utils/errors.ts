/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/utils/errors.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
export interface ErrorData {
  [key: string]: any;
}

/**
 * Base error class for MCP Hub errors
 * All errors should extend from this to ensure consistent structure
 */
export class MCPHubError extends Error {
  public code: string;
  public data: ErrorData;

  constructor(code: string, message: string, data: ErrorData = {}) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'MCPHubError';

    // Preserve the proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Format error for logging
   */
  toJSON(): { code: string; message: string; data: ErrorData; stack?: string } {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
      stack: this.stack,
    };
  }
}

/**
 * Configuration related errors
 */
export class ConfigError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('CONFIG_ERROR', message, data);
    this.name = 'ConfigError';
  }
}

/**
 * Server connection related errors
 */
export class ConnectionError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('CONNECTION_ERROR', message, data);
    this.name = 'ConnectionError';
  }
}

/**
 * Server startup/initialization errors
 */
export class ServerError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('SERVER_ERROR', message, data);
    this.name = 'ServerError';
  }
}

/**
 * Tool execution related errors
 */
export class ToolError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('TOOL_ERROR', message, data);
    this.name = 'ToolError';
  }
}

/**
 * Resource access related errors
 */
export class ResourceError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('RESOURCE_ERROR', message, data);
    this.name = 'ResourceError';
  }
}

/**
 * Request validation errors
 */
export class ValidationError extends MCPHubError {
  constructor(message: string, data: ErrorData = {}) {
    super('VALIDATION_ERROR', message, data);
    this.name = 'ValidationError';
  }
}

/**
 * Helper function to determine if error is one of our custom errors
 */
export function isMCPHubError(error: any): error is MCPHubError {
  return error instanceof MCPHubError;
}

/**
 * Helper function to wrap unknown errors as MCPHubError
 */
export function wrapError(
  error: any,
  code: string = 'UNEXPECTED_ERROR',
  data: ErrorData = {},
): MCPHubError {
  if (isMCPHubError(error)) {
    return error;
  }

  return new MCPHubError(error.code || code, error.message, {
    ...data,
    originalError: error,
  });
}
