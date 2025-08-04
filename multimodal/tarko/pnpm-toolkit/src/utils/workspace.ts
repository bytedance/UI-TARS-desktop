/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Workspace utilities for PTK
 * Provides functions to interact with pnpm workspaces
 */
import { existsSync, readFileSync, promises as fsPromises } from 'fs';
import { join } from 'path';

import fastGlob from 'fast-glob';
import yaml from 'js-yaml';
import type { PackageJson, WorkspacePackage, WorkspaceConfig } from '../types';

/**
 * Reads package.json from a given directory (async version)
 */
export async function readPackageJsonAsync(dir: string): Promise<PackageJson> {
  try {
    const filePath = join(dir, 'package.json');
    const content = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return { name: '', version: '' } as PackageJson;
  }
}

/**
 * Reads package.json from a given directory
 */
export function readPackageJson(dir: string): PackageJson {
  try {
    return require(join(dir, 'package.json'));
  } catch (err) {
    return { name: '', version: '' } as PackageJson;
  }
}

/**
 * Reads workspace package patterns from pnpm-workspace.yaml
 */
export function readWorkspacePatterns(cwd = process.cwd()): string[] {
  try {
    const workspacePath = join(cwd, 'pnpm-workspace.yaml');
    if (!existsSync(workspacePath)) {
      return [];
    }

    const content = readFileSync(workspacePath, 'utf-8');
    const parsed = yaml.load(content) as { packages?: string[] };
    return parsed?.packages || [];
  } catch (error) {
    console.error('Failed to read pnpm-workspace.yaml:', error);
    return [];
  }
}

/**
 * Resolves workspace configuration
 */
export function resolveWorkspaceConfig(cwd = process.cwd()): WorkspaceConfig {
  const rootPackageJson = readPackageJson(cwd);
  const workspacePatterns = readWorkspacePatterns(cwd);

  // Fallback to package.json workspaces if pnpm workspace not found
  const patterns =
    workspacePatterns.length > 0 ? workspacePatterns : rootPackageJson.workspaces || [];

  if (patterns.length === 0) {
    throw new Error('No workspace patterns found in pnpm-workspace.yaml or package.json');
  }

  return {
    rootPath: cwd,
    rootPackageJson,
    patterns,
  };
}

/**
 * Loads all packages in the workspace
 */
export async function loadWorkspacePackages(cwd = process.cwd()): Promise<WorkspacePackage[]> {
  const config = resolveWorkspaceConfig(cwd);

  // console.time('glob-search');

  // Use fast-glob with optimized configuration
  const packageJsonPaths = await fastGlob(
    config.patterns.map((pattern) => join(pattern, 'package.json')),
    {
      cwd,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ['**/node_modules/**'],
      absolute: false,
    },
  );

  // console.timeEnd('glob-search');

  // Load all package information in parallel
  const packages = await Promise.all(
    packageJsonPaths.map(async (relativePath) => {
      const dir = join(cwd, relativePath.replace(/\/package\.json$/, ''));
      const packageJson = await readPackageJsonAsync(dir);

      return {
        name: packageJson.name,
        version: packageJson.version,
        dir,
        packageJson,
        isPrivate: !!packageJson.private,
      };
    }),
  );

  return packages;
}
