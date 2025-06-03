/**
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

/**
 * Changelog command implementation
 * Generates and processes changelog files
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';

import { resolveWorkspaceConfig } from '../utils/workspace';
import { gitCommit, gitPush, getCommitAuthorMap } from '../utils/git';
import { logger } from '../utils/logger';
import { AIChangelogGenerator } from '../utils/ai-changelog';

import type { ChangelogOptions, CommitAuthor } from '../types';

// Regexp to match commit references
const COMMIT_RE = /\(\[([a-z0-9]{7})\]\(([^()]*)\)\)([^\n()[]]*)?(\[@(.*)\]\(.*\))?/gm;

/**
 * Generates a changelog using conventional-changelog-cli
 */
async function generateChangelogWithConventional(cwd: string, isFirst = false): Promise<void> {
  try {
    // Find conventional-changelog-cli path
    const conventionalChangelogPath = require.resolve('conventional-changelog-cli/cli.js', {
      paths: [process.cwd(), ...module.paths],
    });

    await execa(
      conventionalChangelogPath,
      ['-p', 'angular', '-i', 'CHANGELOG.md', '-s', '-r', isFirst ? '0' : '2'],
      {
        cwd,
        stdio: 'inherit',
      },
    );
  } catch (error) {
    logger.error(
      `Failed to generate changelog with conventional-changelog: ${(error as Error).message}`,
    );
    throw error;
  }
}

/**
 * Beautifies changelog by removing top-level useless header
 */
function beautifyChangelog(content: string): string {
  content = content.trim();
  const lines = content.split('\n');

  if (/# \[((0|1)\.0\.0)?\]/.test(lines[0])) {
    return lines.slice(1).join('\n').trim();
  }

  return content;
}

/**
 * Normalizes commit URLs in changelog
 */
function normalizeCommitUrls(content: string): string {
  return content.replace(COMMIT_RE, (match) => {
    return match.replace('commits', 'commit');
  });
}

/**
 * Attaches author information to each commit in changelog
 */
function attachAuthors(
  content: string,
  cwd: string,
  displayType: 'name' | 'email' = 'name',
): string {
  const authorMap = getCommitAuthorMap(cwd);

  return content.replace(
    COMMIT_RE,
    (
      match,
      hash /* hash */,
      url /* url */,
      space /* white space */,
      authorPart /* author part */,
      authorText /* author text */,
    ): string => {
      const author = authorMap[hash];

      // If author part already exists or no author found, return unchanged
      if (!author || authorPart) {
        return match;
      }

      const displayName = displayType === 'name' ? author.name : author.emailName;
      const authorUrl = `https://github.com/${author.name}`;

      return `([${hash}](${url})) [@${displayName}](${authorUrl})`;
    },
  );
}

/**
 * Process changelog through a pipeline of transformations
 */
function processChangelog(content: string, cwd: string, options: ChangelogOptions): string {
  let result = content;

  // Apply normalizeCommitUrls transformation
  result = normalizeCommitUrls(result);

  // Apply attachAuthors transformation if requested
  if (options.attachAuthor) {
    result = attachAuthors(result, cwd, options.authorNameType);
  }

  // Apply beautifyChangelog transformation if requested
  if (options.beautify) {
    result = beautifyChangelog(result);
  }

  return result;
}

/**
 * Changelog command implementation
 */
export async function changelog(options: ChangelogOptions = {}): Promise<void> {
  console.log('options', options);

  const {
    cwd = process.cwd(),
    beautify = false,
    commit = false,
    gitPush: shouldPush = false,
    attachAuthor = false,
    authorNameType = 'name',
    useAi = false,
    model,
    apiKey,
    baseURL,
    provider,
    tagPrefix = 'v',
    dryRun = false,
  } = options;

  console.log('useAi', useAi);

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
  const isFirst = !existsSync(changelogPath);
  let changelogContent = '';

  // Choose between AI-powered or conventional changelog generation
  if (useAi) {
    // Generate changelog using AI
    // logger.info(`Generating changelog for ${version} using AI...`);
    // const generator = new AIChangelogGenerator(cwd, tagPrefix, {
    //   provider,
    //   model,
    //   apiKey,
    //   baseURL,
    // });
    // try {
    //   // Generate and write changelog
    //   const newContent = await generator.generate(version);
    //   if (!dryRun) {
    //     await generator.updateChangelogFile(version, newContent, changelogPath);
    //   } else {
    //     logger.info(`[dry-run] Would update changelog with AI-generated content`);
    //     console.log('\n--- AI Generated Changelog Preview ---\n');
    //     console.log(newContent);
    //     console.log('\n--- End of Preview ---\n');
    //   }
    //   // Read the updated changelog
    //   changelogContent = dryRun ? newContent : readFileSync(changelogPath, 'utf-8');
    // } catch (error) {
    //   logger.error(`Error generating AI changelog: ${(error as Error).message}`);
    //   logger.info('Falling back to conventional changelog generation...');
    //   if (dryRun) {
    //     logger.info(`[dry-run] Would generate fallback changelog using conventional-changelog`);
    //     return;
    //   }
    //   // Fallback to conventional changelog
    //   await generateChangelogWithConventional(cwd, isFirst);
    //   changelogContent = readFileSync(changelogPath, 'utf-8');
    //   changelogContent = processChangelog(changelogContent, cwd, {
    //     beautify,
    //     attachAuthor,
    //     authorNameType,
    //   });
    //   writeFileSync(changelogPath, changelogContent, 'utf-8');
    // }
  } else {
    if (dryRun) {
      logger.info(`[dry-run] Would generate changelog for ${version} using conventional-changelog`);
      return;
    }

    // Use conventional-changelog
    logger.info(`Generating changelog for ${version} using conventional-changelog...`);

    // Generate the changelog
    await generateChangelogWithConventional(cwd, isFirst);

    // Read the generated changelog
    changelogContent = readFileSync(changelogPath, 'utf-8');

    // Process the changelog
    changelogContent = processChangelog(changelogContent, cwd, {
      beautify,
      attachAuthor,
      authorNameType,
    });

    // Write back the processed changelog
    writeFileSync(changelogPath, changelogContent, 'utf-8');
  }

  // Create a commit if requested
  if (commit && !dryRun) {
    await gitCommit(`chore(all): ${version} changelog`, cwd);
  } else if (commit && dryRun) {
    logger.info(`[dry-run] Would create commit: chore(all): ${version} changelog`);
  }

  // Push changes if requested
  if (shouldPush && !dryRun) {
    await gitPush(cwd);
  } else if (shouldPush && dryRun) {
    logger.info(`[dry-run] Would push changes to remote`);
  }

  logger.success('Changelog generated successfully!');
}
