/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Constants for Tarko
 */
export const TARKO_CONSTANTS = {
  /**
   * Session data db name
   */
  SESSION_DATA_DB_NAME: 'tarko.db',

  /**
   * Global workspace directory name
   * Used for storing workspace configuration files
   */
  GLOBAL_WORKSPACE_DIR: '.tarko',

  /**
   * Global storage directory name
   * Used for storing application data like databases, logs, etc.
   */
  GLOBAL_STORAGE_DIR: '.tarko-storage',

  /**
   * Default workspace directory name for projects
   */
  DEFAULT_WORKSPACE_DIR: 'tarko-workspace',
} as const;
