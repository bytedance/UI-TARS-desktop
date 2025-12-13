/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Publishing workflow utilities
 */

import { join } from 'path';
import { readJsonSync } from 'fs-extra';
import type { WorkspacePackage } from '../types';
import { logger } from './logger';
import { publishPackage } from './npm';
import {
  replaceWorkspaceDependencies,
  restorePackageDependencies,
  checkUnreplacedDeps,
  type DependencyBackup,
} from './dependencies';

/**
 * Publishes a single package with workspace dependency management
 */
export async function publishSinglePackage(
  pkg: WorkspacePackage,
  packages: WorkspacePackage[],
  version: string,
  tag: string,
  ignoreScripts: boolean,
  dryRun: boolean,
): Promise<void> {
  let backup: DependencyBackup | null = null;

  try {
    // Replace workspace dependencies for this package only
    backup = await replaceWorkspaceDependencies(pkg, packages, version, dryRun);

    // Verify replacement was successful
    if (!dryRun && backup) {
      const packageJson = readJsonSync(join(pkg.dir, 'package.json'));
      checkUnreplacedDeps(packageJson.dependencies, pkg.name);
      checkUnreplacedDeps(
        packageJson.devDependencies,
        pkg.name,
        'devDependencies',
      );
      checkUnreplacedDeps(
        packageJson.peerDependencies,
        pkg.name,
        'peerDependencies',
      );
    }

    // Publish the package
    logger.info(`Publishing ${pkg.name}...`);
    await publishPackage(pkg.dir, tag, ignoreScripts, dryRun);
  } finally {
    // Always restore dependencies, even if publishing fails
    if (backup) {
      await restorePackageDependencies(backup, dryRun);
    }
  }
}

/**
 * Publishes multiple packages with workspace dependency management
 */
export async function publishPackages(
  packagesToPublish: WorkspacePackage[],
  packages: WorkspacePackage[],
  version: string,
  tag: string,
  ignoreScripts: boolean,
  dryRun: boolean,
  runInBand = false,
): Promise<void> {
  try {
    if (runInBand) {
      for (const pkg of packagesToPublish) {
        await publishSinglePackage(
          pkg,
          packages,
          version,
          tag,
          ignoreScripts,
          dryRun,
        );
      }
    } else {
      await Promise.all(
        packagesToPublish.map(async (pkg) => {
          await publishSinglePackage(
            pkg,
            packages,
            version,
            tag,
            ignoreScripts,
            dryRun,
          );
        }),
      );
    }
  } catch (error) {
    logger.error(`Error during publish: ${(error as Error).message}`);
    throw error;
  }
}
