/**
 * The following code is modified based on
 * https://github.com/ravitemer/mcp-hub/blob/main/src/utils/errors.js
 *
 * MIT License
 * Copyright (c) 2024 Ravitemer
 * https://github.com/ravitemer/mcp-hub/blob/main/LICENSE.md
 */
import fs from 'fs';
import path from 'path';
import { getLogDirectory } from './xdg-paths.js';

interface LoggerOptions {
  logFile?: string;
  logLevel?: LogLevel;
  enableFileLogging?: boolean;
}

interface LogEntry {
  type: LogLevel;
  message: string;
  data: Record<string, any>;
  timestamp: string;
  code?: string;
}

interface LogOptions {
  exit?: boolean;
  exitCode?: number;
  level?: LogLevel;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type ConsoleMethod = 'error' | 'warn' | 'debug' | 'log';

interface SSEManager {
  broadcast(event: string, data: any): void;
}

/**
 * Logger class that handles both file and console logging with structured JSON output
 */

const LOG_DIR = getLogDirectory();
const LOG_FILE = 'mcp-hub.log';
class Logger {
  private logFile: string;
  private logLevel: LogLevel;
  private enableFileLogging: boolean;
  private sseManager: SSEManager | null;
  private readonly LOG_LEVELS: Record<LogLevel, number>;

  constructor(options: LoggerOptions = {}) {
    this.logFile = options.logFile || path.join(LOG_DIR, LOG_FILE);
    this.logLevel = options.logLevel || 'info';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.sseManager = null;

    this.LOG_LEVELS = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    // Initialize logging
    this.initializeLogFile();
    this.setupErrorHandlers();
  }

  /**
   * Sets the SSE manager for real-time log streaming
   */
  setSseManager(manager: SSEManager): void {
    this.sseManager = manager;
  }

  /**
   * Initialize log file
   */
  private initializeLogFile(): void {
    if (!this.enableFileLogging) return;

    try {
      const logDir = path.dirname(this.logFile);
      fs.mkdirSync(logDir, { recursive: true });
      //--empty the log file
      fs.writeFileSync(this.logFile, '');
    } catch (error: any) {
      console.error(`Failed to initialize log file: ${error.message}`);
      this.enableFileLogging = false;
    }
  }

  /**
   * Setup error handlers for EPIPE
   */
  private setupErrorHandlers(): void {
    const handleError = (error: any) => {
      //INFO: when mcp-hub is not started from a terminal, but bya program when the program is closed, writing to stdout,stderr will throw an EPIPE error
      if (error.code !== 'EPIPE') {
        console.error('Stream error:', error);
      }
    };

    process.stdout.on('error', handleError);
    process.stderr.on('error', handleError);
  }

  /**
   * Core logging method that all other methods use
   */
  log(
    type: LogLevel,
    message: string,
    data: Record<string, any> = {},
    code: string | null = null,
    options: LogOptions = {},
  ): void {
    const { exit = false, exitCode = 1, level = type } = options;

    if (this.LOG_LEVELS[this.logLevel] < this.LOG_LEVELS[level]) return;

    const entry: LogEntry = {
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
      ...(code && { code }),
    };

    // Console output
    const consoleMethod: ConsoleMethod =
      type === 'error'
        ? 'error'
        : type === 'warn'
          ? 'warn'
          : type === 'debug'
            ? 'debug'
            : 'log';

    console[consoleMethod](JSON.stringify(entry));

    this.file(entry.message);
    // Broadcast through SSE if available and appropriate level
    if (
      this.sseManager &&
      this.LOG_LEVELS[level] <= this.LOG_LEVELS[this.logLevel]
    ) {
      this.sseManager.broadcast('log', entry);
    }

    if (exit) {
      //sigterm
      process.emit('SIGTERM');
      // process.exit(exitCode);
    }
  }

  file(message: string, data: Record<string, any> = {}): void {
    // File output
    if (this.enableFileLogging) {
      try {
        fs.appendFileSync(this.logFile, message + '\n');
      } catch (error: any) {
        if (error.code !== 'EPIPE') {
          this.enableFileLogging = false;
        }
      }
    }
  }

  /**
   * Log status update
   */
  logUpdate(metadata: Record<string, any> = {}): void {
    this.log('info', 'MCP Hub status updated', metadata, 'MCP_HUB_UPDATED');
  }

  /**
   * Log capability changes
   */
  logCapabilityChange(
    type: string,
    serverName: string,
    data: Record<string, any> = {},
  ): void {
    this.log(
      'info',
      `${serverName} ${type.toLowerCase()} list updated`,
      { type, server: serverName, ...data },
      `${type}_LIST_CHANGED`,
    );
  }

  /**
   * Log info message
   */
  info(message: string, data: Record<string, any> = {}): void {
    this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data: Record<string, any> = {}): void {
    this.log('warn', message, data);
  }

  /**
   * Log debug message
   */
  debug(message: string, data: Record<string, any> = {}): void {
    this.log('debug', message, data);
  }

  /**
   * Log error message
   */
  error(
    code: string,
    message: string,
    data: Record<string, any> = {},
    exit: boolean = true,
    exitCode: number = 1,
  ): void {
    this.log('error', message, data, code, { exit, exitCode });
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    if (this.LOG_LEVELS[level] !== undefined) {
      this.logLevel = level;
    }
  }

  /**
   * Enable/disable file logging
   */
  setFileLogging(enable: boolean): void {
    this.enableFileLogging = enable;
    if (enable) {
      this.initializeLogFile();
    }
  }
}

// Create logger instance
const logger = new Logger({
  logLevel: 'debug',
});

// Handle unhandled errors
process.on('uncaughtException', (error: any) => {
  logger.error(
    error.code || 'UNHANDLED_ERROR',
    `An unhandled error occurred: ${error}`,
    { message: error.message, stack: error.stack },
  );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: any) => {
  logger.error(
    'UNHANDLED_REJECTION',
    `An unhandled rejection occurred: ${error}`,
  );
});

export default logger;
