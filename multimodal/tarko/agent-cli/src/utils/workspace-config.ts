/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { AgentAppConfig } from '@tarko/interface';

/**
 * Workspace configuration file paths
 */
export const WORKSPACE_CONFIG_PATHS = {
  INSTRUCTIONS: '.tarko/instructions.md',
  // Future: RULES: '.tarko/rules/*.md',
} as const;

/**
 * Load workspace configuration from .tarko directory
 */
export function loadWorkspaceConfig(workspacePath: string): Partial<AgentAppConfig> {
  const config: Partial<AgentAppConfig> = {};

  // Load instructions.md if exists
  const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
  if (fs.existsSync(instructionsPath)) {
    try {
      const instructions = fs.readFileSync(instructionsPath, 'utf-8').trim();
      if (instructions) {
        config.instructions = instructions;
      }
    } catch (error) {
      console.warn(
        `Warning: Failed to read ${instructionsPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return config;
}

/**
 * Check if workspace has any .tarko configuration files
 */
export function hasWorkspaceConfig(workspacePath: string): boolean {
  const tarkoDir = path.join(workspacePath, '.tarko');
  if (!fs.existsSync(tarkoDir)) {
    return false;
  }

  const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
  return fs.existsSync(instructionsPath);
}
