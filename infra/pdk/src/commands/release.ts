/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Release command implementation
 * Manages version updates and package publishing
 */

import { ok } from 'assert';
import { join } from 'path';
import { readJsonSync, writeJsonSync } from 'fs-extra';
import { execa } from 'execa';

// Utils
import {
  loadWorkspacePackages,
  resolveWorkspaceConfig,
} from '../utils/workspace';
import { gitCommit, gitCreateTag, gitPushTag } from '../utils/git';
import { logger } from '../utils/logger';
import { createGitHubRelease } from '../utils/github';
import { patch } from './patch';
import { changelog } from './changelog';

// New extracted utilities
import {
  generateCanaryVersion,
  selectVersionAndTag,
  updatePackageVersion,
} from '../utils/version';
import { publishPackages } from '../utils/publishing';
import { runBuildScript } from '../utils/build';
import {
  confirmRelease,
  confirmPackagesToPublish,
  confirmTagPush,
} from '../utils/interactive';
import { ReleaseBranchManager } from '../utils/branch-manager';

import type { ReleaseOptions } from '../types';

/**
 * Release command implementation
 */
export async function release(options: ReleaseOptions = {}): Promise<void> {
  const {
    cwd = process.cwd(),
    dryRun = false,
    changelog: generateChangelog = true,
    runInBand = false,
    ignoreScripts = false,
    build = false,
    pushTag = false,
    tagPrefix = 'v',
    canary = false,
    useAi = false,
    createGithubRelease = false,
    autoCreateReleaseBranch = false,
    releaseVersion,
    releaseTag,
    skipConfirm = false,
  } = options;

  if (dryRun) {
    logger.info('Dry run mode enabled - no actual changes will be made');
  }

  // Initialize branch manager if needed
  const branchManager = autoCreateReleaseBranch
    ? new ReleaseBranchManager()
    : null;

  // Initialize version and tag variables for error handling
  let version: string;
  let tag: string;

  try {
    // Get workspace configuration
    const config = resolveWorkspaceConfig(cwd);
    const currentVersion = config.rootPackageJson.version || '0.0.0';

    logger.info(`Current version: ${currentVersion}`);

    // Get version and tag based on canary mode

    if (canary) {
      // Skip prompts for canary release
      const canaryResult = await generateCanaryVersion(currentVersion, cwd);
      version = canaryResult.version;
      tag = canaryResult.tag;
      logger.info(`Canary release: ${version} (${tag})`);
    } else if (releaseVersion && releaseTag) {
      // Use directly specified version and tag
      version = releaseVersion;
      tag = releaseTag;

      // Validate version
      if (!require('semver').valid(version)) {
        throw new Error(`Invalid version: ${version}`);
      }

      logger.info(`Direct release: ${version} (${tag})`);

      // Confirm release unless skip-confirm is enabled
      if (!skipConfirm) {
        const confirmed = await confirmRelease(version, tag);
        if (!confirmed) {
          return;
        }
      }
    } else {
      // Prompt for version and tag
      const result = await selectVersionAndTag(currentVersion, {
        version: releaseVersion,
        tag: releaseTag,
      });
      version = result.version;
      tag = result.tag;

      // Confirm release unless skip-confirm is enabled
      if (!skipConfirm) {
        const confirmed = await confirmRelease(version, tag);
        if (!confirmed) {
          return;
        }
      }
    }

    ok(version, 'Version must be defined');
    ok(tag, 'Tag must be defined');

    // Handle auto-create release branch
    if (branchManager) {
      await branchManager.createReleaseBranch(version, cwd, dryRun);
    }

    // Set environment variable for build scripts
    process.env.RELEASE_VERSION = version;

    // Load workspace packages
    const packages = await loadWorkspacePackages(cwd);

    // Filter packages to publish
    const packagesToPublish = packages.filter((pkg) => !pkg.isPrivate);

    if (packagesToPublish.length === 0) {
      logger.warn(
        'No packages to publish! Check your workspace configuration.',
      );
      return;
    }

    // Confirm packages to publish unless skip-confirm is enabled
    if (!skipConfirm) {
      const packagesConfirmed = await confirmPackagesToPublish(
        packagesToPublish,
        canary,
      );
      if (!packagesConfirmed) {
        return;
      }
    }

    // Update all package versions FIRST (before build)
    // This ensures build scripts can read the correct version from package.json
    packages.forEach((pkg) => {
      const packageJsonPath = join(pkg.dir, 'package.json');
      if (dryRun) {
        logger.info(
          `[dry-run] Would update version in ${packageJsonPath} to ${version}`,
        );
      } else {
        const packageJson = readJsonSync(packageJsonPath);
        packageJson.version = version;
        writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
      }
    });

    // Update root package version if it exists (without committing)
    const rootPackageJsonPath = join(cwd, 'package.json');
    if (require('fs').existsSync(rootPackageJsonPath)) {
      const rootPackageJson = readJsonSync(rootPackageJsonPath);
      rootPackageJson.version = version;
      if (!dryRun) {
        writeJsonSync(rootPackageJsonPath, rootPackageJson, { spaces: 2 });
      } else {
        logger.info(
          `[dry-run] Would update root package.json to version ${version}`,
        );
      }
    }

    // Run build script if specified (now with updated version)
    if (build) {
      await runBuildScript(build, cwd, dryRun);
    }

    // Publish packages with workspace dependency management
    // Dependency replacement is handled within publishPackages to avoid duplication
    await publishPackages(
      packagesToPublish,
      packages,
      version,
      tag,
      ignoreScripts,
      dryRun,
      runInBand,
    );

    // Generate changelog first (but don't commit yet)
    let changelogGenerated = false;
    if (generateChangelog && version) {
      await handleChangelogGeneration(version, cwd, dryRun, options, false); // Don't commit
      changelogGenerated = true;
    }

    // Git tag related operations (includes changelog in commit if generated)
    await handleGitOperations(
      version,
      tag,
      tagPrefix,
      cwd,
      dryRun,
      pushTag,
      canary,
      changelogGenerated,
      skipConfirm,
    );

    // Create GitHub release if requested
    if (createGithubRelease && version && tag) {
      await handleGitHubRelease(version, tag, cwd, dryRun, tagPrefix);
    }

    // Switch back to original branch if auto-create release branch was used
    if (branchManager) {
      await branchManager.switchBackToOriginalBranch(cwd, dryRun);
    }

    logger.success(`Release ${version || 'unknown'} completed successfully!`);
  } catch (err) {
    await handleReleaseError(err, branchManager, cwd, dryRun, version, tag, skipConfirm);
    throw err;
  }
}

/**
 * Handles git operations for release
 */
async function handleGitOperations(
  version: string,
  tag: string,
  tagPrefix: string,
  cwd: string,
  dryRun: boolean,
  pushTag: boolean,
  canary: boolean,
  changelogGenerated = false,
  skipConfirm = false,
): Promise<void> {
  const tagName = `${tagPrefix}${version}`;

  if (dryRun) {
    const commitMessage = changelogGenerated
      ? `chore(all): release ${version} and changelog`
      : `chore(all): release ${version}`;
    logger.info(`[dry-run] Would create git commit: ${commitMessage}`);
    logger.info(`[dry-run] Would create git tag: ${tagName}`);
    if (pushTag) {
      logger.info(`[dry-run] Would push git tag ${tagName} to remote`);
    }
    return;
  }

  try {
    // Check if tag already exists
    const checkTag = await execa('git', ['tag', '-l', tagName], { cwd });

    if (checkTag.stdout.trim() === tagName) {
      logger.warn(`Tag ${tagName} already exists, skipping tag creation`);
      return;
    }

    // Stage all changes and commit (gitCommit already handles git add -A)
    const commitMessage = changelogGenerated
      ? `chore(all): release ${version} and changelog`
      : `chore(all): release ${version}`;
    await gitCommit(commitMessage, cwd);

    // Create tag
    await gitCreateTag(tagName, `Release ${version}`, cwd);
    logger.success(`Created git tag: ${tagName}`);

    // Handle tag pushing
    await handleTagPush(tagName, cwd, pushTag, canary, skipConfirm);
  } catch (err) {
    logger.error(`Failed to create git tag: ${(err as Error).message}`);
  }
}

/**
 * Handles tag pushing logic
 */
async function handleTagPush(
  tagName: string,
  cwd: string,
  pushTag: boolean,
  canary: boolean,
  skipConfirm = false,
): Promise<void> {
  const shouldPush =
    pushTag ||
    canary ||
    skipConfirm ||
    await confirmTagPush(tagName, canary);

  if (!shouldPush) {
    return;
  }

  try {
    logger.info(`Pushing git tag to remote...`);
    await gitPushTag(tagName, true, cwd);
    logger.success(`Successfully pushed tag and commit to remote`);
  } catch (err) {
    logger.error(`Failed to push to remote: ${(err as Error).message}`);
    logger.info(
      `You can manually push the tag later with: git push origin ${tagName}`,
    );
  }
}

/**
 * Handles changelog generation
 */
async function handleChangelogGeneration(
  version: string,
  cwd: string,
  dryRun: boolean,
  options: ReleaseOptions,
  commit = true,
): Promise<void> {
  const changelogOptions = {
    cwd,
    version,
    beautify: true,
    commit: commit && !dryRun,
    gitPush: false, // Never push here, let release handle it
    attachAuthor: false,
    authorNameType: 'name' as const,
    useAi: options.useAi,
    model: options.model,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    provider: options.provider,
    tagPrefix: options.tagPrefix,
    dryRun: dryRun && !options.useAi, // Only consider dryRun flag in non-AI mode
    filterScopes: options.filterScopes,
    filterTypes: options.filterTypes,
  };

  if (dryRun && !options.useAi) {
    logger.info(
      `[dry-run] Would generate changelog with options: ${JSON.stringify(changelogOptions)}`,
    );
    return;
  }

  // In dry-run + useAi mode, actually run changelog generation for testing
  if (dryRun && options.useAi) {
    logger.info(
      `Running AI changelog generation even in dry-run mode for testing purposes`,
    );
  }

  await changelog(changelogOptions);
}

/**
 * Handles GitHub release creation
 */
async function handleGitHubRelease(
  version: string,
  tagName: string,
  cwd: string,
  dryRun: boolean,
  tagPrefix?: string,
): Promise<void> {
  try {
    await createGitHubRelease({
      version,
      tagName,
      cwd,
      dryRun,
      tagPrefix,
    });
  } catch (error) {
    logger.error(
      `Failed to create GitHub release: ${(error as Error).message}`,
    );
    logger.warn('Release was successful but GitHub release creation failed');
    // Don't throw here as the main release was successful
  }
}

/**
 * Handles release errors and cleanup
 */
async function handleReleaseError(
  err: unknown,
  branchManager: ReleaseBranchManager | null,
  cwd: string,
  dryRun: boolean,
  version: string,
  tag: string,
  skipConfirm: boolean,
): Promise<void> {
  logger.error(`Release failed: ${(err as Error).message}`);

  // Handle branch cleanup
  if (branchManager) {
    await branchManager.handleBranchError(cwd, dryRun);
  }

  // Try to patch the failed release only if we have version and tag
  if (!dryRun && !skipConfirm && version && tag) {
    try {
      await patch({
        cwd,
        version,
        tag,
        runInBand: false, // Default value
        ignoreScripts: false, // Default value
      });
    } catch (patchErr) {
      logger.error(`Failed to patch release: ${(patchErr as Error).message}`);
    }
  }
}
