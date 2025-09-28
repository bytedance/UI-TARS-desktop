/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GitHub Release command implementation
 * Creates GitHub releases independently from npm publishing
 */
import { resolveWorkspaceConfig } from '../utils/workspace';
import { createGitHubRelease } from '../utils/github';
import { logger } from '../utils/logger';

import type { GitHubReleaseOptions } from '../types';

/**
 * GitHub Release command implementation
 */
export async function githubRelease(options: GitHubReleaseOptions = {}): Promise<void> {
  const { cwd = process.cwd(), version, tagPrefix = 'v', dryRun = false } = options;

  if (dryRun) {
    logger.info('Dry run mode enabled - no actual GitHub release will be created');
  }

  try {
    // Get version from options or package.json
    let releaseVersion = version;
    if (!releaseVersion) {
      const config = resolveWorkspaceConfig(cwd);
      releaseVersion = config.rootPackageJson.version;

      if (!releaseVersion) {
        throw new Error(
          'Version is required. Provide --version or ensure package.json has a version field.',
        );
      }
    }

    logger.info(`Creating GitHub release for version: ${releaseVersion}`);

    // Construct tag name
    const tagName = `${tagPrefix}${releaseVersion}`;

    // Create GitHub release
    await createGitHubRelease({
      version: releaseVersion,
      tagName,
      cwd,
      dryRun,
    });

    if (!dryRun) {
      logger.success(`✅ Successfully created GitHub release: ${tagName}`);
    }
  } catch (err) {
    logger.error(`GitHub release failed: ${(err as Error).message}`);
    throw err;
  }
}
