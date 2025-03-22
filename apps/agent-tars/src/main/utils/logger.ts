/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import fs from 'fs-extra';
import { shell } from 'electron';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { getOmegaDir } from '../mcp/client';

// Ensure log directory exists
const ensureLogDir = async (): Promise<string> => {
  const omegaDir = await getOmegaDir();
  const logDir = path.join(omegaDir, 'logs');
  await fs.ensureDir(logDir);
  return logDir;
};

// Create log file path
const createLogFilePath = async (): Promise<string> => {
  const logDir = await ensureLogDir();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `agent-tars-${date}.log`);
};

// File logger
class FileLogger extends ConsoleLogger {
  private logFilePath: string | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(prefix = '', level: LogLevel = LogLevel.INFO) {
    super(prefix, level);
    // Don't call async methods directly in constructor
    // Initialize on first use instead
  }

  private async initLogFile(): Promise<void> {
    // If initialization is already in progress, return that Promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // Create new initialization Promise
    this.initPromise = (async () => {
      try {
        // If already initialized, return
        if (this.logFilePath) return;

        this.logFilePath = await createLogFilePath();
        // Ensure log file exists
        await fs.ensureFile(this.logFilePath);

        // Add startup marker
        const timestamp = new Date().toISOString();
        await fs.appendFile(
          this.logFilePath,
          `\n\n--- Agent TARS started at ${timestamp} ---\n\n`,
        );
      } catch (error) {
        console.error('Failed to initialize log file:', error);
        // Reset Promise to allow retry on next attempt
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async writeToFile(message: string) {
    // Ensure log file is initialized
    await this.initLogFile();

    if (this.logFilePath) {
      try {
        const timestamp = new Date().toISOString();
        await fs.appendFile(this.logFilePath, `[${timestamp}] ${message}\n`);
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  override log(...args: any[]): void {
    super.log(...args);
    this.writeToFile(`[LOG] ${args.join(' ')}`);
  }

  override info(...args: any[]): void {
    super.info(...args);
    this.writeToFile(
      `[INFO] ${args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ')}`,
    );
  }

  override warn(...args: any[]): void {
    super.warn(...args);
    this.writeToFile(`[WARN] ${args.join(' ')}`);
  }

  override error(...args: any[]): void {
    super.error(...args);
    this.writeToFile(`[ERROR] ${args.join(' ')}`);
  }

  override success(message: string): void {
    super.success(message);
    this.writeToFile(`[SUCCESS] ${message}`);
  }

  override infoWithData<T = any>(
    message: string,
    data?: T,
    transformer?: (value: T) => any,
  ): void {
    super.infoWithData(message, data, transformer);
    const transformedData = data
      ? transformer
        ? transformer(data)
        : data
      : '';
    this.writeToFile(`[INFO] ${message} ${JSON.stringify(transformedData)}`);
  }

  // Get log file path
  async getLogPath(): Promise<string> {
    await this.initLogFile();
    return this.logFilePath || '';
  }

  // Get log directory
  async getLogDir(): Promise<string> {
    return ensureLogDir();
  }

  // Open log file
  async openLogFile(): Promise<void> {
    const logPath = await this.getLogPath();
    if (logPath) {
      await shell.openPath(logPath);
    }
  }

  // Open log directory
  async openLogDir(): Promise<void> {
    const logDir = await this.getLogDir();
    await shell.openPath(logDir);
  }
}

// Create global logger instance
export const logger = new FileLogger('[Agent-TARS]', LogLevel.INFO);

// Export convenience methods
export const openLogFile = async () => {
  await logger.openLogFile();
};

export const openLogDir = async () => {
  await logger.openLogDir();
};
