/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GitHub utilities for creating releases
 */
import { execa } from 'execa';
import { readFileSync } from 'fs';
import { join } from 'path';
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
 * Finds CHANGELOG.md file in the current directory or parent directories
 */
function findChangelogPath(cwd: string): string | null {
  const fs = require('fs');
  const path = require('path');

  let currentDir = cwd;

  // First try current directory
  let changelogPath = path.join(currentDir, 'CHANGELOG.md');
  if (fs.existsSync(changelogPath)) {
    return changelogPath;
  }

  // Then try common subdirectories where changelog might be
  const commonDirs = ['multimodal', 'packages', 'apps'];
  for (const dir of commonDirs) {
    changelogPath = path.join(currentDir, dir, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      return changelogPath;
    }
  }

  // Finally try parent directories (up to 3 levels)
  for (let i = 0; i < 3; i++) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root

    currentDir = parentDir;
    changelogPath = path.join(currentDir, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      return changelogPath;
    }

    // Also check common subdirectories in parent
    for (const dir of commonDirs) {
      changelogPath = path.join(currentDir, dir, 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        return changelogPath;
      }
    }
  }

  return null;
}

/**
 * Extracts release notes for a specific version from CHANGELOG.md
 */
export function extractReleaseNotes(version: string, cwd: string): string {
  try {
    const changelogPath = findChangelogPath(cwd);

    if (!changelogPath) {
      logger.warn('CHANGELOG.md not found in current directory or common locations');
      return `Release ${version}`;
    }

    logger.info(`Reading changelog from: ${changelogPath}`);
    const changelogContent = readFileSync(changelogPath, 'utf-8');

    // Find the section for this version
    // Pattern: ## [version](link) (date) or ## version (date)
    const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const versionPattern = new RegExp(
      `## \\[${escapedVersion}\\][^\n]*\n([\\s\\S]*?)(?=\n## |$)`,
      'i',
    );

    logger.info(`Looking for version pattern: ## [${version}]`);

    const match = changelogContent.match(versionPattern);

    if (!match || !match[1]) {
      logger.warn(`No release notes found for version ${version} in changelog`);
      return `Release ${version}`;
    }

    // Clean up the extracted content
    let releaseNotes = match[1].trim();

    // Remove any trailing newlines and empty sections
    releaseNotes = releaseNotes.replace(/\n\s*\n\s*$/, '');

    if (!releaseNotes) {
      return `Release ${version}`;
    }

    return releaseNotes;
  } catch (error) {
    logger.warn(`Failed to extract release notes: ${(error as Error).message}`);
    return `Release ${version}`;
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
 * Creates a GitHub release using GitHub CLI
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

    // Extract release notes from changelog
    const releaseNotes = extractReleaseNotes(version, cwd);

    // Determine if this is a prerelease
    const isPrerelease = version.includes('-');

    if (dryRun) {
      logger.info(`[dry-run] Would create GitHub release:`);
      logger.info(`  Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      logger.info(`  Tag: ${tagName}`);
      logger.info(`  Title: Release ${version}`);
      logger.info(`  Prerelease: ${isPrerelease}`);
      logger.info(`  Release notes preview:`);
      console.log('\n--- Release Notes Preview ---\n');
      console.log(releaseNotes);
      console.log('\n--- End of Preview ---\n');
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

    // Create the release
    const releaseArgs = [
      'release',
      'create',
      tagName,
      '--repo',
      `${repoInfo.owner}/${repoInfo.repo}`,
      '--title',
      `Release ${version}`,
      '--notes',
      releaseNotes,
    ];

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
