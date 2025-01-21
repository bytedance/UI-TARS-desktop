/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from 'node:fs';

import { BrowserWindow, app, dialog, shell } from 'electron';
import log from 'electron-log';

export const logger = log.scope('main');
log.initialize();

log.transports.file.level =
  process.env.NODE_ENV === 'development' ? 'debug' : 'info';

export function getLogFilePath() {
  return log.transports.file.getFile().path;
}

export async function revealLogFile() {
  const filePath = getLogFilePath();
  return await shell.openPath(filePath);
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
  clearLogs();
  log.transports.console.level = false;
});
