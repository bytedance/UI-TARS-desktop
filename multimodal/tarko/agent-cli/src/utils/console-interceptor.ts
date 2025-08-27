/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

interface ConsoleInterceptorOptions {
  silent?: boolean;
  capture?: boolean;
  filter?: (message: string) => boolean;
  debug?: boolean;
}

/**
 * ConsoleInterceptor - Temporarily intercepts console output
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

    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  start(): void {
    if (this.options.debug) {
      this.originalConsole.error('AgentCLI Starting console output interception');
    }

    console.log = this.createInterceptor(this.originalConsole.log);
    console.info = this.createInterceptor(this.originalConsole.info);
    console.warn = this.createInterceptor(this.originalConsole.warn, process.stderr);
    console.error = this.createInterceptor(this.originalConsole.error, process.stderr);
    console.debug = this.createInterceptor(this.originalConsole.debug);
  }

  stop(): void {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;

    if (this.options.debug) {
      this.originalConsole.error('AgentCLI Console output interception stopped');
    }
  }

  getCapturedOutput(): string[] {
    return [...this.buffer];
  }

  getCapturedString(): string {
    return this.buffer.join('\n');
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  private createInterceptor(
    original: (...args: any[]) => void,
    stream: NodeJS.WriteStream = process.stdout,
  ): (...args: any[]) => void {
    return (...args: any[]): void => {
      const message = args
        .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
        .join(' ');

      if (this.options.filter && !this.options.filter(message)) {
        original.apply(console, args);
        return;
      }

      if (this.options.capture) {
        this.buffer.push(message);
      }

      if (this.options.debug) {
        this.originalConsole.error(`AgentCLI [Intercepted]: ${message}`);
      }

      if (!this.options.silent) {
        original.apply(console, args);
      }
    };
  }

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
