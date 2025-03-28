/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import fs from 'fs-extra';
import { shell } from 'electron';
import { ConsoleLogger, LogLevel } from '@agent-infra/logger';
import { getOmegaDir } from '../mcp/client';

/**
 * Maximum size of a log file (10MB)
 */
export const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of log files to keep
 */
export const MAX_LOG_FILES = 5;

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
  private currentLogFileSize = 0;
  private writeQueue: Promise<void> = Promise.resolve();

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

        // Get current file size if it exists
        try {
          const stats = await fs.stat(this.logFilePath);
          this.currentLogFileSize = stats.size;
        } catch (error) {
          this.currentLogFileSize = 0;
        }

        // Add startup marker
        const timestamp = new Date().toISOString();
        const startupMessage = `\n\n--- Agent TARS started at ${timestamp} ---\n\n`;
        await fs.appendFile(this.logFilePath, startupMessage);
        this.currentLogFileSize += Buffer.byteLength(startupMessage);
      } catch (error) {
        console.error('Failed to initialize log file:', error);
        // Reset Promise to allow retry on next attempt
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async checkLogFileSize(): Promise<void> {
    if (this.currentLogFileSize > MAX_LOG_FILE_SIZE && this.logFilePath) {
      // Create a new log file name with timestamp
      const dir = path.dirname(this.logFilePath);
      const baseFileName = path.basename(this.logFilePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = `${baseFileName}.${timestamp}`;
      const rotatedFilePath = path.join(dir, rotatedFileName);

      try {
        // Rename current log file to include timestamp
        await fs.rename(this.logFilePath, rotatedFilePath);

        // Clean up old log files if there are too many
        await this.cleanupOldLogFiles(dir);

        // Reset current log file
        this.logFilePath = null;
        this.currentLogFileSize = 0;
        await this.initLogFile();
      } catch (error) {
        console.error('Failed to rotate log file:', error);
      }
    }
  }

  private async cleanupOldLogFiles(logDir: string): Promise<void> {
    try {
      // Get all log files
      const files = await fs.readdir(logDir);
      const logFiles = files.filter(
        (file) => file.startsWith('agent-tars-') && file.endsWith('.log'),
      );

      // If we have more than MAX_LOG_FILES, delete the oldest ones
      if (logFiles.length > MAX_LOG_FILES) {
        // Sort files by creation time (oldest first)
        const fileStats = await Promise.all(
          logFiles.map(async (file) => {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);
            return { file, filePath, ctime: stats.ctime };
          }),
        );

        fileStats.sort((a, b) => a.ctime.getTime() - b.ctime.getTime());

        // Delete oldest files
        const filesToDelete = fileStats.slice(
          0,
          fileStats.length - MAX_LOG_FILES,
        );
        for (const fileInfo of filesToDelete) {
          await fs.unlink(fileInfo.filePath);
        }
      }
    } catch (error) {
      console.error('Failed to clean up old log files:', error);
    }
  }

  private async writeToFile(message: string) {
    // Queue this write operation to ensure logs are written in order
    this.writeQueue = this.writeQueue.then(async () => {
      // Ensure log file is initialized
      await this.initLogFile();

      if (this.logFilePath) {
        try {
          const timestamp = new Date().toISOString();
          const logEntry = `[${timestamp}] ${message}\n`;
          const logSize = Buffer.byteLength(logEntry);

          // Check if adding this log would exceed the size limit
          if (this.currentLogFileSize + logSize > MAX_LOG_FILE_SIZE) {
            await this.checkLogFileSize();
          }

          await fs.appendFile(this.logFilePath, logEntry);
          this.currentLogFileSize += logSize;
        } catch (error) {
          console.error('Failed to write to log file:', error);
        }
      }
    });

    return this.writeQueue;
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
