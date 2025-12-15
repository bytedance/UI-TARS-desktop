/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GitHub utilities for creating releases
 */
import { execa } from 'execa';
import { logger } from './logger';
import { shouldIncludeCommitByScope } from './commit';

// Username mapping for commit authors to correct GitHub usernames
const USERNAME_MAP: Record<string, string> = {
  chenhaoli: 'ulivz',
  小健: 'cjraft',
};

/**
 * Extract GitHub username from noreply email or apply manual mapping
 */
function resolveGitHubUsername(
  authorName: string,
  authorEmail: string,
): string {
  // Extract from GitHub noreply email pattern: {id}+{username}@users.noreply.github.com
  const emailMatch = authorEmail.match(
    /^\d+\+([^@]+)@users\.noreply\.github\.com$/,
  );
  if (emailMatch) {
    return emailMatch[1];
  }

  // Fallback to manual mapping
  return USERNAME_MAP[authorName] || authorName;
}

/**
 * GitHub release options
 */
export interface GitHubReleaseOptions {
  version: string;
  tagName: string;
  cwd: string;
  dryRun?: boolean;
  tagPrefix?: string;
}

/**
 * Gets the previous tag for generating release notes
 * Handles mixed tag formats (v1.0.0 and @sailors@1.0.0)
 * Filters out canary releases and filters by tagPrefix
 */
export async function getPreviousTag(
  tagName: string,
  cwd: string,
  tagPrefix?: string,
): Promise<string | null> {
  try {
    // Get all tags sorted by creation date (chronological order, newest first)
    const { stdout } = await execa('git', ['tag', '--sort=-creatordate'], {
      cwd,
    });
    const allTags = stdout.trim().split('\n').filter(Boolean);

    if (allTags.length === 0) {
      return null;
    }

    // Filter out canary releases and apply tagPrefix filter if provided
    let filteredTags = allTags.filter((tag) => !tag.includes('canary'));
    
    // Apply tagPrefix filter if provided
    if (tagPrefix) {
      filteredTags = filteredTags.filter((tag) => tag.startsWith(tagPrefix));
    }

    if (filteredTags.length === 0) {
      return null;
    }

    // Find the current tag in the filtered list
    const currentIndex = filteredTags.findIndex((tag) => tag === tagName);

    if (currentIndex === -1) {
      // If current tag not found, it might be a new tag
      // Return the most recent filtered tag (first in the list)
      return filteredTags[0] || null;
    }

    // Return the next tag (previous in chronological order)
    if (currentIndex < filteredTags.length - 1) {
      return filteredTags[currentIndex + 1];
    }

    return null;
  } catch (error) {
    logger.warn(`Failed to get previous tag: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Generates beautiful release notes using conventional-changelog format
 */
export async function generateReleaseNotes(
  tagName: string,
  previousTag: string | null,
  cwd: string,
  repoInfo?: { owner: string; repo: string },
  filterScopes?: string[],
): Promise<string> {
  try {
    // Get commits between tags
    const gitRange = previousTag ? `${previousTag}..${tagName}` : tagName;
    const { stdout } = await execa(
      `git log "${gitRange}" --pretty=format:'%H|%s|%an|%ae' --no-merges`,
      { cwd, shell: true },
    );

    if (!stdout.trim()) {
      return `## What's Changed\n\nNo changes found.`;
    }

    const commits = stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, subject, author, email] = line.split('|');
        return { hash, subject, author, email };
      });

    // Group commits by type
    const groups = {
      feat: [] as typeof commits,
      fix: [] as typeof commits,
      docs: [] as typeof commits,
      style: [] as typeof commits,
      refactor: [] as typeof commits,
      test: [] as typeof commits,
      chore: [] as typeof commits,
      other: [] as typeof commits,
    };

    commits.forEach((commit) => {
      const match = commit.subject.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
      if (match) {
        const [, type] = match;
        
        // Apply scope filter if provided
        if (!shouldIncludeCommitByScope(commit.subject, filterScopes)) {
          return; // Skip this commit
        }
        
        if (type in groups) {
          groups[type as keyof typeof groups].push(commit);
        } else {
          groups.other.push(commit);
        }
      } else {
        groups.other.push(commit);
      }
    });

    // Generate release notes
    let releaseNotes = "## What's Changed\n\n";

    // New Features
    if (groups.feat.length > 0) {
      releaseNotes += '### New Features 🎉\n\n';
      groups.feat.forEach((commit) => {
        const match = commit.subject.match(/^feat(\([^)]+\))?:\s*(.+)$/);
        const description = match ? match[2] : commit.subject;
        const scope = match?.[1] || '';
        releaseNotes += `* feat${scope}: ${description} by @${resolveGitHubUsername(commit.author, commit.email)} in ${commit.hash.substring(0, 7)}\n`;
      });
      releaseNotes += '\n';
    }

    // Bug Fixes
    if (groups.fix.length > 0) {
      releaseNotes += '### Bug Fixes 🐛\n\n';
      groups.fix.forEach((commit) => {
        const match = commit.subject.match(/^fix(\([^)]+\))?:\s*(.+)$/);
        const description = match ? match[2] : commit.subject;
        const scope = match?.[1] || '';
        releaseNotes += `* fix${scope}: ${description} by @${resolveGitHubUsername(commit.author, commit.email)} in ${commit.hash.substring(0, 7)}\n`;
      });
      releaseNotes += '\n';
    }

    // Documentation
    if (groups.docs.length > 0) {
      releaseNotes += '### Documentation 📚\n\n';
      groups.docs.forEach((commit) => {
        const match = commit.subject.match(/^docs(\([^)]+\))?:\s*(.+)$/);
        const description = match ? match[2] : commit.subject;
        const scope = match?.[1] || '';
        releaseNotes += `* docs${scope}: ${description} by @${resolveGitHubUsername(commit.author, commit.email)} in ${commit.hash.substring(0, 7)}\n`;
      });
      releaseNotes += '\n';
    }

    // Other Changes
    const otherCommits = [
      ...groups.style,
      ...groups.refactor,
      ...groups.test,
      ...groups.chore,
      ...groups.other,
    ];
    if (otherCommits.length > 0) {
      releaseNotes += '### Other Changes\n\n';
      otherCommits.forEach((commit) => {
        const match = commit.subject.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
        const type = match?.[1] || '';
        const scope = match?.[2] || '';
        const description = match ? match[3] : commit.subject;
        releaseNotes += `* ${type}${scope}: ${description} by @${resolveGitHubUsername(commit.author, commit.email)} in ${commit.hash.substring(0, 7)}\n`;
      });
    }

    // Add Full Changelog link if repository info is available
    if (repoInfo) {
      if (previousTag) {
        // Use the original tags for display to preserve custom formats
        const changelogText = `${previousTag}...${tagName}`;
        releaseNotes += `\n**Full Changelog**: [${changelogText}](https://github.com/${repoInfo.owner}/${repoInfo.repo}/compare/${previousTag}...${tagName})`;
      } else {
        releaseNotes += `\n**Full Changelog**: [${tagName}](https://github.com/${repoInfo.owner}/${repoInfo.repo}/commits/${tagName})`;
      }
    }

    return releaseNotes;
  } catch (error) {
    logger.warn(
      `Failed to generate release notes: ${(error as Error).message}`,
    );
    return `## What's Changed\n\nRelease ${tagName}`;
  }
}

/**
 * Gets repository URL from git remote
 */
export async function getRepositoryInfo(
  cwd: string,
): Promise<{ owner: string; repo: string } | null> {
  try {
    const { stdout } = await execa(
      'git',
      ['config', '--get', 'remote.origin.url'],
      { cwd },
    );
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
export async function createGitHubRelease(
  options: GitHubReleaseOptions,
): Promise<void> {
  const { version, tagName, cwd, dryRun = false, tagPrefix } = options;

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
      throw new Error(
        'Not authenticated with GitHub CLI. Please run "gh auth login" first.',
      );
    }

    // Get repository info
    const repoInfo = await getRepositoryInfo(cwd);
    if (!repoInfo) {
      throw new Error('Could not determine GitHub repository information');
    }

    // Determine if this is a prerelease
    const isPrerelease = version.includes('-');

    // Get previous tag for generating release notes
    const previousTag = await getPreviousTag(tagName, cwd, tagPrefix);

    // Extract version from tag name for display purposes
    const releaseTitle = tagName.startsWith('@')
      ? `v${tagName.split('@').pop()}`
      : tagName.startsWith('v')
        ? tagName
        : `v${tagName}`;

    if (dryRun) {
      logger.info(`[dry-run] Would create GitHub release:`);
      logger.info(`  Repository: ${repoInfo.owner}/${repoInfo.repo}`);
      logger.info(`  Tag: ${tagName}`);
      logger.info(`  Title: ${releaseTitle}`);
      logger.info(`  Prerelease: ${isPrerelease}`);
      if (previousTag) {
        logger.info(`  Generate notes from: ${previousTag}`);
      } else {
        logger.info(`  Generate notes from: repository start`);
      }

      // Generate and show release notes preview
      logger.info(`\n[dry-run] Release notes preview:`);
      logger.info(`${'='.repeat(50)}`);
      const releaseNotes = await generateReleaseNotes(
        tagName,
        previousTag,
        cwd,
        repoInfo,
      );
      console.log(releaseNotes);
      logger.info(`${'='.repeat(50)}`);
      return;
    }

    // Check if release already exists
    try {
      await execa(
        'gh',
        [
          'release',
          'view',
          tagName,
          '--repo',
          `${repoInfo.owner}/${repoInfo.repo}`,
        ],
        { cwd },
      );
      logger.warn(
        `GitHub release for tag ${tagName} already exists, skipping creation`,
      );
      return;
    } catch {
      // Release doesn't exist, proceed with creation
    }

    // Generate beautiful release notes
    const releaseNotes = await generateReleaseNotes(
      tagName,
      previousTag,
      cwd,
      repoInfo,
    );

    // Create the release with custom formatted notes

    const releaseArgs = [
      'release',
      'create',
      tagName,
      '--repo',
      `${repoInfo.owner}/${repoInfo.repo}`,
      '--title',
      releaseTitle,
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
    throw new Error(
      `Failed to create GitHub release: ${(error as Error).message}`,
    );
  }
}
