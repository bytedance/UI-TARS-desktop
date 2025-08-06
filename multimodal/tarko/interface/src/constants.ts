/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import * as os from 'os';

/**
 * Constants for Tarko
 */
export const TARKO_CONSTANTS = {
  /**
   * Session data db name
   */
  SESSION_DATA_DB_NAME: 'tarko.db',

  /**
   * Session data json name
   */
  SESSION_DATA_JSON_NAME: 'tarko.json',

  /**
   * Global storage directory name
   * Used for storing application data like databases, logs, etc.
   */
  GLOBAL_STORAGE_DIR: '.tarko-storage',

  /**
   * Global workspace directory name
   * Used for storing workspace configuration files
   */
  GLOBAL_WORKSPACE_DIR: '.tarko',
} as const;

/**
 * Get the storage directory path
 */
export function getGlobalStorageDirectory(dirName: string = TARKO_CONSTANTS.GLOBAL_STORAGE_DIR) {
  if (path.isAbsolute(dirName)) return dirName;
  return path.join(os.homedir(), dirName);
}
