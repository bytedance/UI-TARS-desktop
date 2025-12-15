/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Changelog command implementation (unified)
 * Uses GitHub-release style notes for CHANGELOG.md
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';
import { resolveWorkspaceConfig } from '../utils/workspace';
import { gitCommit, gitPush } from '../utils/git';
import { logger } from '../utils/logger';
import {
  getPreviousTag,
  generateReleaseNotes,
  getRepositoryInfo,
} from '../utils/github';
import { AIChangelogGenerator } from '../utils/ai-changelog';
import type { ModelProviderName } from '@tarko/model-provider';

import type { ChangelogOptions } from '../types';

/**
 * Creates or updates CHANGELOG.md
 */
async function updateChangelogFile(
  changelogContent: string,
  changelogPath: string,
): Promise<void> {
  // Read existing changelog
  let existingContent = '';
  if (existsSync(changelogPath)) {
    existingContent = readFileSync(changelogPath, 'utf-8');
  } else {
    existingContent = '# Changelog\n';
  }

  // For new changelog, just create it
  if (
    existingContent === '# Changelog\n' ||
    !existingContent.includes('# Changelog')
  ) {
    writeFileSync(changelogPath, `# Changelog\n\n${changelogContent}`, 'utf-8');
    return;
  }

  // For existing changelog, insert after the header
  const updatedContent = existingContent.replace(
    /# Changelog\s+/,
    `# Changelog\n\n${changelogContent}`,
  );

  writeFileSync(changelogPath, updatedContent, 'utf-8');
}

/**
 * Changelog command implementation
 */
export async function changelog(options: ChangelogOptions = {}): Promise<void> {
  const {
    cwd = process.cwd(),
    commit = false,
    gitPush: shouldPush = false,
    tagPrefix = 'v',
    dryRun = false,
  } = options;

  let { version } = options;

  // Try to get version from package.json if not provided
  if (!version) {
    const config = resolveWorkspaceConfig(cwd);
    version = config.rootPackageJson.version;

    if (!version) {
      throw new Error('Version is required for changelog generation');
    }
  }

  const changelogPath = join(cwd, 'CHANGELOG.md');
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Construct tag name - try to find actual git tag first
  let tagName = `${tagPrefix}${version}`;
  
  // Try to find the actual git tag that matches this version
  try {
    const { stdout } = await execa('git', ['tag', '--list', `${tagPrefix}${version}`], { cwd });
    const matchingTags = stdout.trim().split('\n').filter(Boolean);
    if (matchingTags.length > 0) {
      // Use the actual tag that exists
      tagName = matchingTags[0];
    }
  } catch {
    // Fall back to constructed tag name
  }

  // Resolve repo info
  const repoInfo = await getRepositoryInfo(cwd);

  // Get previous tag (non-canary) with tagPrefix filter
  const previousTag = await getPreviousTag(tagName, cwd, tagPrefix);

  logger.info(
    `📝 Generating unified changelog from ${previousTag || 'repository start'} to ${tagName}`,
  );

  let releaseNotes: string;

  if (options.useAi) {
    const aiGenerator = new AIChangelogGenerator(cwd, tagPrefix, {
      id: options.model || 'gpt-4o',
      provider: options.provider as ModelProviderName,
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });

    releaseNotes = await aiGenerator.generate(
      version,
      previousTag,
      options.filterScopes,
    );
  } else {
    // Use traditional GitHub-style release notes
    releaseNotes = await generateReleaseNotes(
      tagName,
      previousTag,
      cwd,
      repoInfo || undefined,
      options.filterScopes,
    );
  }

  // Compose final changelog entry with version header
  const entry = `## ${tagName} (${today})\n\n${releaseNotes}\n`;

  if (dryRun) {
    logger.info(`[dry-run] Would update CHANGELOG.md with:`);
    console.log('\n--- Changelog Preview ---\n');
    console.log(entry);
    console.log('\n--- End of Preview ---\n');
  } else {
    await updateChangelogFile(entry, changelogPath);
    logger.success('Changelog generated successfully!');
  }

  // Create a commit if requested
  if (commit) {
    if (!dryRun) {
      await gitCommit(`chore(all): ${version} changelog`, cwd);
      logger.success('Committed changelog changes');
    } else {
      logger.info(
        `[dry-run] Would create commit: chore(all): ${version} changelog`,
      );
    }
  }

  // Push changes if requested
  if (shouldPush) {
    if (!dryRun) {
      await gitPush(cwd);
      logger.success('Pushed changes to remote');
    } else {
      logger.info(`[dry-run] Would push changes to remote`);
    }
  }
}
