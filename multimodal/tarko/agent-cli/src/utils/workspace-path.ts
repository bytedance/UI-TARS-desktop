/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Resolve a workspace path, supporting various formats:
 * - Relative paths: './workspace', 'workspace'
 * - Home directory: '~/.agent-tars', '~/workspace'
 * - Absolute paths: '/path/to/workspace'
 * If no path is provided, uses current working directory
 *
 * @param baseDir The base directory to resolve relative paths from (usually cwd)
 * @param workspacePath Optional workspace path specification
 * @returns Resolved absolute path to the workspace directory
 */
export function resolveWorkspacePath(baseDir: string, workspacePath?: string): string {
  let resolvedPath: string;

  // If no workspace path provided, use current working directory
  if (!workspacePath) {
    resolvedPath = baseDir;
  }

  // Handle home directory paths (starting with ~)
  else if (workspacePath.startsWith('~')) {
    resolvedPath = workspacePath.replace(/^~/, os.homedir());
  }

  // Handle absolute paths
  else if (path.isAbsolute(workspacePath)) {
    resolvedPath = workspacePath;
  }

  // Handle relative paths
  else {
    resolvedPath = path.resolve(baseDir, workspacePath);
  }

  return resolvedPath;
}

/**
 * Ensures the specified workspace directory exists
 *
 * @param workspacePath Path to workspace directory
 * @returns The ensured workspace path
 * @throws Error if directory creation fails
 */
export function ensureWorkspaceDirectory(workspacePath: string): string {
  try {
    fs.mkdirSync(workspacePath, { recursive: true });
    return workspacePath;
  } catch (error) {
    throw new Error(
      `Failed to create workspace directory ${workspacePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
