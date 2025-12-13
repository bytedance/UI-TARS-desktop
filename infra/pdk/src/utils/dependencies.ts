/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Workspace dependency management utilities
 */

import { join } from 'path';
import { readJsonSync, writeJsonSync } from 'fs-extra';

import type { WorkspacePackage } from '../types';
import { logger } from './logger';

// Keeps track of original dependencies to restore after publishing
export interface DependencyBackup {
  packagePath: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Helper function to check for unreplaced workspace dependencies
 */
export const checkUnreplacedDeps = (
  deps: Record<string, string> | undefined, 
  pkgName: string, 
  type = 'dependencies'
): void => {
  if (!deps) return;
  Object.entries(deps).forEach(([dep, depVersion]) => {
    if (depVersion && depVersion.startsWith('workspace:')) {
      throw new Error(
        `Found unreplaced workspace dependency in ${pkgName} ${type}: ${dep}: ${depVersion}`,
      );
    }
  });
};

/**
 * Checks if a package has workspace dependencies
 */
export const hasWorkspaceDependencies = (packageJson: any): boolean => {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ].some((deps) => 
    deps && Object.values(deps).some((depVersion) => 
      depVersion && typeof depVersion === 'string' && depVersion.startsWith('workspace:')
    )
  );
};

/**
 * Creates a backup of package dependencies
 */
export function createDependencyBackup(
  packageJsonPath: string,
  packageJson: any,
): DependencyBackup {
  return {
    packagePath: packageJsonPath,
    dependencies: packageJson.dependencies
      ? { ...packageJson.dependencies }
      : undefined,
    devDependencies: packageJson.devDependencies
      ? { ...packageJson.devDependencies }
      : undefined,
    peerDependencies: packageJson.peerDependencies
      ? { ...packageJson.peerDependencies }
      : undefined,
  };
}

/**
 * Replaces workspace dependencies for a single package
 */
export async function replaceWorkspaceDependencies(
  pkg: WorkspacePackage,
  packages: WorkspacePackage[],
  version: string,
  dryRun = false,
): Promise<DependencyBackup | null> {
  const packageJsonPath = join(pkg.dir, 'package.json');
  const packageJson = readJsonSync(packageJsonPath);

  // Check if there are any workspace dependencies
  if (!hasWorkspaceDependencies(packageJson)) {
    return null;
  }

  // Create backup
  const backup = createDependencyBackup(packageJsonPath, packageJson);

  if (dryRun) {
    logger.info(`[dry-run] Would replace workspace dependencies in ${pkg.name}`);
    return backup;
  }

  // Update internal dependencies to point to the new version
  const updateDeps = (deps?: Record<string, string>) => {
    if (!deps) return;

    Object.keys(deps).forEach((dep) => {
      if (deps[dep] && deps[dep].startsWith('workspace:')) {
        const depPkg = packages.find((p) => p.name === dep);
        if (depPkg) {
          logger.info(
            `Replacing ${pkg.name}'s dependency ${dep}: ${deps[dep]} → ${version}`,
          );
          deps[dep] = version;
        }
      }
    });
  };

  updateDeps(packageJson.dependencies);
  updateDeps(packageJson.devDependencies);
  updateDeps(packageJson.peerDependencies);

  writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  
  return backup;
}

/**
 * Restores original workspace dependencies for a single package
 */
export async function restorePackageDependencies(
  backup: DependencyBackup,
  dryRun = false,
): Promise<void> {
  if (dryRun) {
    logger.info(`[dry-run] Would restore dependencies for package`);
    return;
  }

  try {
    const packageJson = readJsonSync(backup.packagePath);

    // Restore dependencies
    if (backup.dependencies) {
      packageJson.dependencies = backup.dependencies;
    }

    // Restore devDependencies
    if (backup.devDependencies) {
      packageJson.devDependencies = backup.devDependencies;
    }

    // Restore peerDependencies
    if (backup.peerDependencies) {
      packageJson.peerDependencies = backup.peerDependencies;
    }

    writeJsonSync(backup.packagePath, packageJson, { spaces: 2 });
  } catch (err) {
    logger.error(
      `Failed to restore dependencies for ${backup.packagePath}: ${(err as Error).message}`,
    );
  }
}