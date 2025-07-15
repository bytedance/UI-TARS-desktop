/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from './misc';

interface ConsoleInterceptorOptions {
  /**
   * If true, will silence all console output
   */
  silent?: boolean;

  /**
   * If true, will capture all console output to the buffer
   */
  capture?: boolean;

  /**
   * If provided, will check each message against this filter
   * and only silence or capture messages that match
   */
  filter?: (message: string) => boolean;

  /**
   * If true, will log intercepted messages at debug level
   */
  debug?: boolean;
}

/**
 * ConsoleInterceptor - Temporarily intercepts console output
 *
 * This class provides a way to intercept and control all console output
 * during a specific operation, allowing silent execution or capture of logs.
 */
export class ConsoleInterceptor {
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  private buffer: string[] = [];
  private options: ConsoleInterceptorOptions;

  constructor(options: ConsoleInterceptorOptions = {}) {
    this.options = {
      silent: true,
      capture: true,
      ...options,
    };

    // Store original console methods
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  /**
   * Start intercepting console output
   */
  start(): void {
    if (this.options.debug) {
      logger.debug('Starting console output interception');
    }

    // Override console methods
    console.log = this.createInterceptor(this.originalConsole.log);
    console.info = this.createInterceptor(this.originalConsole.info);
    console.warn = this.createInterceptor(this.originalConsole.warn, process.stderr);
    console.error = this.createInterceptor(this.originalConsole.error, process.stderr);
    console.debug = this.createInterceptor(this.originalConsole.debug);
  }

  /**
   * Stop intercepting and restore original console behavior
   */
  stop(): void {
    // Restore original console methods
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;

    if (this.options.debug) {
      logger.debug('Console output interception stopped');
    }
  }

  /**
   * Get all captured console output
   */
  getCapturedOutput(): string[] {
    return [...this.buffer];
  }

  /**
   * Get captured output as a single string
   */
  getCapturedString(): string {
    return this.buffer.join('\n');
  }

  /**
   * Clear the captured output buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Create a replacement function for console methods
   */
  private createInterceptor(
    original: (...args: any[]) => void,
    stream: NodeJS.WriteStream = process.stdout,
  ): (...args: any[]) => void {
    return (...args: any[]): void => {
      const message = args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');

      // Apply filter if provided
      if (this.options.filter && !this.options.filter(message)) {
        original.apply(console, args);
        return;
      }

      // Capture the output if requested
      if (this.options.capture) {
        this.buffer.push(message);
      }

      // Log to debug if requested
      if (this.options.debug) {
        logger.debug(`[Intercepted]: ${message}`);
      }

      // If not in silent mode, pass through to original
      if (!this.options.silent) {
        original.apply(console, args);
      }
    };
  }

  /**
   * Execute a function with console interception
   *
   * @param fn Function to execute with intercepted console
   * @returns Result of the function
   */
  static async run<T>(
    fn: () => Promise<T>,
    options?: ConsoleInterceptorOptions,
  ): Promise<{
    result: T;
    logs: string[];
  }> {
    const interceptor = new ConsoleInterceptor(options);
    interceptor.start();

    try {
      const result = await fn();
      return {
        result,
        logs: interceptor.getCapturedOutput(),
      };
    } finally {
      interceptor.stop();
    }
  }
}
