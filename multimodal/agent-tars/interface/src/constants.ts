/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Default directory names for Agent TARS
 */
export const AGENT_TARS_CONSTANTS = {
  /**
   * Global workspace directory name for Agent TARS
   * Used for storing workspace configuration files
   */
  GLOBAL_WORKSPACE_DIR: '.agent-tars-workspace',

  /**
   * Global storage directory name for Agent TARS
   * Used for storing application data like databases, logs, etc.
   */
  GLOBAL_STORAGE_DIR: '.agent-tars',
} as const;
