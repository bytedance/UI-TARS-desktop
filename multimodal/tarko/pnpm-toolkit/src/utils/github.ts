/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GitHub utilities for creating releases
 */
import { execa } from 'execa';
import { logger } from './logger';

/**
 * GitHub release options
 */
export interface GitHubReleaseOptions {
  version: string;
  tagName: string;
  cwd: string;
  dryRun?: boolean;
}

/**
 * Gets the previous tag for generating release notes
 */
export async function getPreviousTag(tagName: string, cwd: string): Promise<string | null> {
  try {
    // Get all tags sorted by version
    const { stdout } = await execa('git', ['tag', '--sort=-version:refname'], { cwd });
    const tags = stdout.trim().split('\n').filter(Boolean);
    
    // Find the current tag index
    const currentIndex = tags.indexOf(tagName);
    
    // Return the next tag (previous in chronological order)
    if (currentIndex >= 0 && currentIndex < tags.length - 1) {
      return tags[currentIndex + 1];
    }
    
    return null;
  } catch (error) {
    logger.warn(`Failed to get previous tag: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Gets repository URL from git remote
 */
export async function getRepositoryInfo(
  cwd: string,
): Promise<{ owner: string; repo: string } | null> {
  try {
    const { stdout } = await execa('git', ['config', '--get', 'remote.origin.url'], { cwd });
    const url = stdout.trim();

    // Parse GitHub URL (both HTTPS and SSH)
    // HTTPS: https://github.com/owner/repo.git
    // SSH: git@github.com:owner/repo.git
    const match = url.match(/github\.com[:\/]([^/]+)\/([^/]+?)(?:\.git)?$/);

    if (!match) {
      logger.warn('Could not parse GitHub repository URL');
      return null;
    }

    const [, owner, repo] = match;
    return { owner, repo };
  } catch (error) {
    logger.warn(`Failed to get repository info: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Creates a GitHub release using GitHub CLI with native release notes generation
 */
export async function createGitHubRelease(options: GitHubReleaseOptions): Promise<void> {
  const { version, tagName, cwd, dryRun = false } = options;

  try {
    // Check if GitHub CLI is available
    try {
      await execa('gh', ['--version'], { cwd });
    } catch (error) {
      throw new Error(
        'GitHub CLI (gh) is not installed or not available in PATH. Please install it from https://cli.github.com/',
      );
    }

    // Check if user is authenticated
    try {
      await execa('gh', ['auth', 'status'], { cwd });
    } catch (error) {
      throw new Error('Not authenticated with GitHub CLI. Please run "gh auth login" first.');
    }

    // Get repository info
    const repoInfo = await getRepositoryInfo(cwd);
    if (!repoInfo) {
      throw new Error('Could not determine GitHub repository information');
    }

    // Determine if this is a prerelease
    const isPrerelease = version.includes('-');

    // Get previous tag for generating release notes
    const previousTag = await getPreviousTag(tagName, cwd);

    if (dryRun) {
      logger.info(`[dry-run] Would create GitHub release:`);
      logger.info(`  Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      logger.info(`  Tag: ${tagName}`);
      logger.info(`  Title: ${tagName}`);
      logger.info(`  Prerelease: ${isPrerelease}`);
      if (previousTag) {
        logger.info(`  Generate notes from: ${previousTag}`);
      } else {
        logger.info(`  Generate notes from: repository start`);
      }
      return;
    }

    // Check if release already exists
    try {
      await execa(
        'gh',
        ['release', 'view', tagName, '--repo', `${repoInfo.owner}/${repoInfo.repo}`],
        { cwd },
      );
      logger.warn(`GitHub release for tag ${tagName} already exists, skipping creation`);
      return;
    } catch {
      // Release doesn't exist, proceed with creation
    }

    // Create the release using GitHub's native release notes generation
    const releaseArgs = [
      'release',
      'create',
      tagName,
      '--repo',
      `${repoInfo.owner}/${repoInfo.repo}`,
      '--title',
      tagName,
      '--generate-notes',
    ];

    // Add previous tag for better release notes if available
    if (previousTag) {
      releaseArgs.push('--notes-start-tag', previousTag);
    }

    if (isPrerelease) {
      releaseArgs.push('--prerelease');
    }

    logger.info(`Creating GitHub release for ${tagName}...`);
    await execa('gh', releaseArgs, { cwd, stdio: 'inherit' });

    logger.success(`✅ Successfully created GitHub release: ${tagName}`);

    // Get the release URL
    try {
      const { stdout } = await execa(
        'gh',
        [
          'release',
          'view',
          tagName,
          '--repo',
          `${repoInfo.owner}/${repoInfo.repo}`,
          '--json',
          'url',
          '--jq',
          '.url',
        ],
        { cwd },
      );
      logger.info(`🔗 Release URL: ${stdout.trim()}`);
    } catch {
      // Ignore if we can't get the URL
    }
  } catch (error) {
    throw new Error(`Failed to create GitHub release: ${(error as Error).message}`);
  }
}
