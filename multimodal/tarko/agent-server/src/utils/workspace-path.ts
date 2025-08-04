/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { TARKO_CONSTANTS } from '@tarko/agent-server-interface';

/**
 * WorkspacePathManager provides utilities for handling workspace directory paths,
 * supporting various path formats (absolute, relative, home directory) and
 * ensuring the directories exist.
 */
export class WorkspacePathManager {
  /**
   * Resolve a workspace path, supporting various formats:
   * - Relative paths: './workspace', 'workspace'
   * - Home directory: '~/.agent-tars', '~/workspace'
   * - Absolute paths: '/path/to/workspace'
   * If no path is provided, uses the provided default or fallback to constant
   *
   * @param baseDir The base directory to resolve relative paths from (usually cwd)
   * @param workspacePath Optional workspace path specification
   * @param namespace Optional workspace namespace for isolation (e.g. session ID)
   * @param isolateSessions Whether to create isolated session directories
   * @param defaultWorkspaceDir Default workspace directory name to use when no path is provided
   * @returns Resolved absolute path to the workspace directory
   */
  public static resolveWorkspacePath(
    baseDir: string,
    workspacePath?: string,
    namespace?: string,
    isolateSessions?: boolean,
    defaultWorkspaceDir?: string,
  ): string {
    let resolvedPath: string;

    // If no workspace path provided, use provided default or fallback to constant
    if (!workspacePath) {
      const workspaceDirName = defaultWorkspaceDir || TARKO_CONSTANTS.DEFAULT_WORKSPACE_DIR;
      resolvedPath = path.join(baseDir, workspaceDirName);
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

    // Add namespace subdirectory only if isolateSessions is true and namespace is provided
    if (isolateSessions && namespace) {
      resolvedPath = path.join(resolvedPath, namespace);
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
  public static ensureWorkspaceDirectory(workspacePath: string): string {
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
}
