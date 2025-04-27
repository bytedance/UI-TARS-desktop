/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow, app, dialog, shell } from 'electron';
import log from 'electron-log';

export const logger = log.scope('main');
log.initialize();

log.transports.file.level =
  process.env.NODE_ENV === 'development' ? 'debug' : 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.archiveLogFn = (file) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const newPath = `${file.path}.${timestamp}`;
  fs.renameSync(file.path, newPath);
};

const MAX_LOG_FILES = 5;

export function getLogFilePath() {
  return log.transports.file.getFile().path;
}

export function getLogDir() {
  return path.dirname(getLogFilePath());
}

export async function revealLogFile() {
  const filePath = getLogFilePath();
  return await shell.openPath(filePath);
}

export async function revealLogDir() {
  return await shell.openPath(getLogDir());
}

export function clearLogs() {
  try {
    const logFile = log.transports.file.getFile();
    logFile.clear();
    logger.info('log file cleared');
    return true;
  } catch (error) {
    logger.error('clear log file failed:', error);
    return false;
  }
}

export function getHistoryLogs() {
  const logDir = getLogDir();
  const files = fs
    .readdirSync(logDir)
    .filter((file) => file.startsWith('main.log.'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(logDir, a));
      const statB = fs.statSync(path.join(logDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
  return files.map((file) => path.join(logDir, file));
}

export async function cleanupOldLogs() {
  const logFiles = getHistoryLogs();
  if (logFiles.length > MAX_LOG_FILES) {
    const filesToDelete = logFiles.slice(MAX_LOG_FILES);
    for (const file of filesToDelete) {
      try {
        fs.unlinkSync(file);
        logger.info(`Deleted old log file: ${file}`);
      } catch (error) {
        logger.error(`Failed to delete old log file ${file}:`, error);
      }
    }
  }
}

export async function exportLogs() {
  try {
    const browserWindow =
      BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (!browserWindow) {
      logger.error('No browser window found');
      return false;
    }

    const logFile = log.transports.file.getFile();
    const defaultPath = `ui-tars-logs-${Date.now()}.log`;

    const { filePath } = await dialog.showSaveDialog(browserWindow!, {
      title: 'Export Logs',
      defaultPath: defaultPath,
      filters: [{ name: 'Logs', extensions: ['log'] }],
    });

    if (!filePath) {
      logger.info('User canceled log export');
      return false;
    }

    await fs.promises.copyFile(logFile.path, filePath);
    logger.info(`Logs exported to: ${filePath}`);
    return true;
  } catch (error) {
    logger.error('Export logs failed:', error);
    return false;
  }
}

app.on('before-quit', () => {
  // Remove the clearLogs call from app.on('before-quit')
  // clearLogs();
  log.transports.console.level = false;
});

// Call cleanupOldLogs() when the app starts
cleanupOldLogs().catch((error) => {
  logger.error('Failed to cleanup logs on startup:', error);
});
