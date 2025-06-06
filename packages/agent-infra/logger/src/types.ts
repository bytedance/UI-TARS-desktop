/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Available log colors
 */
export type ColorName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'gray'
  | 'reset';

/**

 * Text style control (separate from colors)
 */
export type TextStyle = 'bold' | 'normal';

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  /** Most verbose level, includes all logs */

  DEBUG = 0,

  /** Standard information messages */

  INFO = 1,

  /** Success messages and operations */

  SUCCESS = 2,
  /** Warning messages */
  WARN = 3,
  /** Error messages */
  ERROR = 4,
  /** No logs will be displayed */
  SILENT = 5,
}

/**
 * Core logger interface defining the required methods for all logger implementations
 */
export interface Logger {
  /**
   * Basic logging method (equivalent to console.log)
   * @param args - Arguments to log
   */
  log(...args: any[]): void;

  /**
   * Log informational messages
   * @param args - Arguments to log
   */
  info(...args: any[]): void;

  /**
   * Log warning messages
   * @param args - Arguments to log
   */
  warn(...args: any[]): void;

  /**
   * Log error messages
   * @param args - Arguments to log
   */
  error(...args: any[]): void;

  /**
   * Log debug messages
   * @param message - Debug message to display
   */
  debug(...args: any[]): void;

  /**
   * Log success messages with green color
   * @param message - Success message to display
   */
  success(message: string): void;

  /**
   * Log a message with associated structured data
   * @param message - The message to log
   * @param data - Optional structured data to log
   * @param transformer - Optional function to transform data before logging
   */
  infoWithData<T = any>(
    message: string,
    data?: T,
    transformer?: (value: T) => any,
  ): void;

  /**
   * Create a new logger with additional prefix
   * @param subPrefix - Prefix to add to the new logger
   * @returns A new logger instance with the combined prefix
   */
  spawn(subPrefix: string): Logger;

  /**
   * Set the current log level
   * @param level - New log level to set
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level
   * @returns Current log level
   */
  getLevel(): LogLevel;
}

/**
 * Base implementation of Logger interface with no-op methods.
 * Useful as a fallback or for extending to create custom loggers.
 */
export class BaseLogger implements Logger {
  log(...args: any[]): void {}

  info(...args: any[]): void {}

  warn(...args: any[]): void {}

  error(...args: any[]): void {}

  debug(...args: any[]): void {}

  success(message: string): void {}

  infoWithData<T = any>(
    message: string,
    data?: T,
    transformer?: (value: T) => any,
  ): void {}

  spawn(subPrefix: string): Logger {
    return new BaseLogger();
  }

  setLevel(level: LogLevel): void {}

  getLevel(): LogLevel {
    return LogLevel.INFO;
  }
}

/**
 * Default no-op logger instance
 */
export const defaultLogger = new BaseLogger();
