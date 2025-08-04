/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

/**
 * Configuration for workspace path resolution
 */
export interface WorkspacePathResolverConfig {
  /** The working directory to resolve relative paths against */
  workspace: string;
}

/**
 * Tool call arguments that may contain path parameters
 */
export interface ToolCallArgs {
  [key: string]: unknown;
  path?: string;
  paths?: string[];
  directory?: string;
  cwd?: string;
  source?: string;
  destination?: string;
}

/**
 * Mapping of tool names to their path parameter names
 */
export interface PathParameterMapping {
  [toolName: string]: string[];
}

/**
 * Create a copy of the default path parameter mapping
 * Avoid state pollution between multiple instances
 */
function createDefaultPathMapping(): PathParameterMapping {
  return {
    // Filesystem tools
    write_file: ['path'],
    read_file: ['path'],
    read_multiple_files: ['paths'],
    edit_file: ['path'],
    create_directory: ['path'],
    list_directory: ['path'],
    directory_tree: ['path'],
    move_file: ['source', 'destination'],
    search_files: ['path'],
    get_file_info: ['path'],

    // Command tools
    run_command: ['cwd'],
    run_script: ['cwd'],
  };
}

/**
 * Default mapping of tool names to their path parameter names
 */
export const DEFAULT_PATH_PARAMETER_MAPPING: PathParameterMapping = createDefaultPathMapping();

/**
 * WorkspacePathResolver - Resolves relative paths to absolute paths within workspace context
 *
 * This utility class provides a centralized way to handle path resolution for tools
 * that operate on files and directories, ensuring they respect the configured workspace.
 *
 * Key features:
 * - Converts relative paths to absolute paths within workspace
 * - Supports configurable path parameter mappings for different tools
 * - Preserves absolute paths that are already correctly specified
 * - Provides type-safe path resolution with proper error handling
 */
export class WorkspacePathResolver {
  private readonly config: WorkspacePathResolverConfig;
  private readonly pathMapping: PathParameterMapping;

  /**
   * Create a new workspace path resolver
   *
   * @param config - Configuration for path resolution
   * @param pathMapping - Custom mapping of tool names to path parameters (optional)
   */
  constructor(
    config: WorkspacePathResolverConfig,

    pathMapping?: PathParameterMapping,
  ) {
    this.config = config;
    this.pathMapping = pathMapping ? { ...pathMapping } : createDefaultPathMapping();
  }

  /**
   * Resolve path parameters in tool call arguments based on workspace context
   *
   * @param toolName - Name of the tool being called
   * @param args - Tool call arguments that may contain path parameters
   * @returns Modified arguments with resolved paths
   */
  resolveToolPaths(toolName: string, args: ToolCallArgs): ToolCallArgs {
    // Handle undefined or null args
    if (!args) {
      return {};
    }

    // Get path parameter names for this tool
    const pathParams = this.pathMapping[toolName];

    // Always create a shallow copy to ensure immutability
    const resolvedArgs = { ...args };

    // If no path parameters are defined for this tool, return the copy as-is
    if (!pathParams || pathParams.length === 0) {
      return resolvedArgs;
    }

    // Process each path parameter
    for (const paramName of pathParams) {
      const pathValue = resolvedArgs[paramName];

      // Handle string paths
      if (typeof pathValue === 'string' && pathValue.trim() !== '') {
        resolvedArgs[paramName] = this.resolvePath(pathValue);
      }
      // Handle array of paths (e.g., read_multiple_files)
      else if (Array.isArray(pathValue)) {
        resolvedArgs[paramName] = pathValue.map((path) => {
          if (typeof path === 'string' && path.trim() !== '') {
            return this.resolvePath(path);
          }
          return path;
        });
      }
    }

    return resolvedArgs;
  }

  /**
   * Resolve a single path relative to the workspace directory
   *
   * @param inputPath - The path to resolve
   * @returns Absolute path resolved within workspace context
   */
  private resolvePath(inputPath: string): string {
    // If already absolute, return as-is
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }

    // Resolve relative path against workspace directory
    return path.resolve(this.config.workspace, inputPath);
  }

  /**
   * Check if a tool has path parameters that can be resolved
   *
   * @param toolName - Name of the tool to check
   * @returns True if the tool has resolvable path parameters
   */
  hasPathParameters(toolName: string): boolean {
    const pathParams = this.pathMapping[toolName];
    return pathParams !== undefined && pathParams.length > 0;
  }

  /**
   * Get the list of path parameter names for a specific tool
   *
   * @param toolName - Name of the tool
   * @returns Array of path parameter names, or empty array if none
   */
  getPathParameters(toolName: string): string[] {
    return this.pathMapping[toolName] || [];
  }

  /**
   * Get the current working directory
   *
   * @returns The configured working directory
   */
  getWorkingDirectory(): string {
    return this.config.workspace;
  }

  /**
   * Update the path parameter mapping for additional tools
   *
   * @param additionalMapping - Additional tool-to-path-parameters mapping
   */
  addPathMapping(additionalMapping: PathParameterMapping): void {
    Object.assign(this.pathMapping, additionalMapping);
  }
}
