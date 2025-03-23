/* eslint-disable @typescript-eslint/no-explicit-any */
import { BrowserWindow } from 'electron';
import { logger } from './logger';

const originalLoggerError = logger.error.bind(logger);

export interface ErrorReporterMessage {
  message: string;
  source: string;
  timestamp: number;
}

/**
 * Utility to report errors to renderer process
 */
export class ErrorReporter {
  /**
   * Send error to all renderer processes
   */
  static sendToRenderer(error: Error | string, source = '[main]') {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorObj: ErrorReporterMessage = {
      message: errorMessage,
      source,
      timestamp: Date.now(),
    };

    // Send to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send('main:error', errorObj);
      }
    });
  }

  /**
   * Initialize global error handlers
   */
  static init() {
    // Monkey patch logger.error to also send errors to renderer
    logger.error = (...args: any[]) => {
      // Call the original logger method
      originalLoggerError.apply(logger, args);

      // Send the first argument to renderer if it's a string or Error
      const firstArg = args[0];
      if (typeof firstArg === 'string' || firstArg instanceof Error) {
        ErrorReporter.sendToRenderer(firstArg);
      } else {
        // Try to stringify the object
        try {
          const message = JSON.stringify(firstArg);
          ErrorReporter.sendToRenderer(message);
        } catch (e) {
          ErrorReporter.sendToRenderer('Unknown error object');
        }
      }
    };
  }
}
