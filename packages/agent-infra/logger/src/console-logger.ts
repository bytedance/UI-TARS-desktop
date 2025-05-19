/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseLogger, ColorName, LogLevel } from './types';
import { colorize, CSS_COLOR_VALUES } from './colorize';

export class ConsoleLogger extends BaseLogger {
  private prefix: string;
  private lastPrefixColor: ColorName | null = null;
  private level: LogLevel = LogLevel.INFO;

  /**
   * Creates a new console logger instance
   *
   * @param prefix - Optional prefix to prepend to all log messages
   * @param level - Initial log level (defaults to INFO)
   */
  constructor(prefix = '', level: LogLevel = LogLevel.INFO) {
    super();
    this.prefix = prefix;
    this.level = level;
  }

  /**
   * Applies color to the prefix based on log type
   *
   * @param prefix - The prefix string to colorize
   * @param type - Optional log type to determine color
   * @returns Colorized prefix string
   * @private
   */
  private colorPrefix(
    prefix: string,
    type?: 'info' | 'warn' | 'error' | 'success' | 'debug',
  ): string {
    if (!prefix) return '';

    let color: ColorName = 'gray';
    switch (type) {
      case 'info':
        color = 'blue';
        break;
      case 'warn':
        color = 'yellow';
        break;
      case 'error':
        color = 'red';
        break;
      case 'debug':
        color = 'gray';
        break;
      case 'success':
        color = 'green';
        break;
    }

    const isBrowser =
      typeof window !== 'undefined' && typeof window.document !== 'undefined';

    if (isBrowser) {
      this.lastPrefixColor = color;
      return prefix;
    }

    return colorize(prefix, color, 'bold');
  }

  /**
   * Basic log method (equivalent to console.log)
   * Only outputs if log level is DEBUG or lower
   *
   * @param args - Arguments to log
   */
  log(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.colorPrefix(this.prefix), ...args);
    }
  }

  /**
   * Logs informational messages
   * Only outputs if log level is INFO or lower
   *
   * @param args - Arguments to log
   */
  info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const prefix = this.colorPrefix(this.prefix, 'info');

      if (typeof window !== 'undefined' && this.lastPrefixColor) {
        console.log(
          `%c${prefix}%c`,
          `color: ${CSS_COLOR_VALUES[this.lastPrefixColor]}; font-weight: bold`,
          'color: inherit',
          ...args,
        );
        this.lastPrefixColor = null;
      } else {
        console.log(`${prefix}`, ...args);
      }
    }
  }

  /**
   * Logs warning messages
   * Only outputs if log level is WARN or lower
   *
   * @param args - Arguments to log
   */
  warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const prefix = this.colorPrefix(this.prefix, 'warn');

      if (typeof window !== 'undefined' && this.lastPrefixColor) {
        console.warn(
          `%c${prefix}%c`,
          `color: ${CSS_COLOR_VALUES[this.lastPrefixColor]}; font-weight: bold`,
          'color: inherit',
          ...args,
        );
        this.lastPrefixColor = null;
      } else {
        console.warn(`${prefix}`, ...args);
      }
    }
  }

  /**
   * Logs error messages
   * Only outputs if log level is ERROR or lower
   *
   * @param args - Arguments to log
   */
  error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const prefix = this.colorPrefix(this.prefix, 'error');

      if (typeof window !== 'undefined' && this.lastPrefixColor) {
        console.error(
          `%c${prefix}%c`,
          `color: ${CSS_COLOR_VALUES[this.lastPrefixColor]}; font-weight: bold`,
          'color: inherit',
          ...args,
        );
        this.lastPrefixColor = null;
      } else {
        console.error(`${prefix}`, ...args);
      }
    }
  }

  /**
   * Logs success messages
   * Only outputs if log level is SUCCESS or lower
   *
   * @param message - Success message to display
   */
  success(message: string): void {
    if (this.level <= LogLevel.SUCCESS) {
      const prefix = this.colorPrefix(this.prefix, 'success');

      if (typeof window !== 'undefined' && this.lastPrefixColor) {
        console.log(
          `%c${prefix}%c ${message}`,
          `color: ${CSS_COLOR_VALUES[this.lastPrefixColor]}; font-weight: bold`,
          'color: inherit',
        );
        this.lastPrefixColor = null;
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  /**
   * Logs debug messages
   * Only outputs if log level is DEBUG or lower
   *
   * @param args - Arguments to log
   */
  debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const prefix = this.colorPrefix(this.prefix, 'debug');

      if (typeof window !== 'undefined' && this.lastPrefixColor) {
        console.debug(
          `%c${prefix}%c`,
          `color: ${CSS_COLOR_VALUES[this.lastPrefixColor]}; font-weight: bold`,
          'color: inherit',
          ...args,
        );
        this.lastPrefixColor = null;
      } else {
        console.debug(`${prefix}`, ...args);
      }
    }
  }

  /**
   * Logs a message with associated structured data
   * Optionally transforms the data before logging
   * Only outputs if log level is INFO or lower
   *
   * @param message - The message to log
   * @param data - Optional structured data to log
   * @param transformer - Optional function to transform data before logging
   */
  infoWithData<T = any>(
    message: string,
    data?: T,
    transformer?: (value: T) => any,
  ): void {
    if (this.level <= LogLevel.INFO) {
      this.info(message);
      if (data) {
        console.log(transformer ? transformer(data) : data);
      }
    }
  }

  /**
   * Creates a child logger with a nested prefix
   *
   * @param prefix - Prefix for the child logger
   * @returns A new ConsoleLogger instance with combined prefix
   */
  spawn(prefix: string): ConsoleLogger {
    const newPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    // Pass the current log level to the child logger
    return new ConsoleLogger(newPrefix, this.level);
  }

  /**
   * Sets the current log level
   *
   * @param level - New log level to set
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Gets the current log level
   *
   * @returns Current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}
