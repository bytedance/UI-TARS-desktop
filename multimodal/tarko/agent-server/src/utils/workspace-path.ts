/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * WorkspacePathManager provides utilities for handling workspace directory paths,
 * supporting various path formats (absolute, relative, home directory) and
 * ensuring the directories exist.
 */
export class WorkspacePathManager {
  /**
   * Default workspace directory name
   */
  private static readonly DEFAULT_WORKSPACE_DIR = 'agent-tars-workspace';

  /**
   * Resolve a workspace path, supporting various formats:
   * - Relative paths: './workspace', 'workspace'
   * - Home directory: '~/.agent-tars', '~/workspace'
   * - Absolute paths: '/path/to/workspace'
   * If no path is provided, uses the default path: 'cwd/agent-tars-workspace'
   *
   * @param baseDir The base directory to resolve relative paths from (usually cwd)
   * @param workspacePath Optional workspace path specification
   * @param namespace Optional workspace namespace for isolation (e.g. session ID)
   * @param isolateSessions Whether to create isolated session directories
   * @returns Resolved absolute path to the workspace directory
   */
  public static resolveWorkspacePath(
    baseDir: string,
    workspacePath?: string,
    namespace?: string,
    isolateSessions?: boolean,
  ): string {
    let resolvedPath: string;

    // If no workspace path provided, use default
    if (!workspacePath) {
      resolvedPath = path.join(baseDir, this.DEFAULT_WORKSPACE_DIR);
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
