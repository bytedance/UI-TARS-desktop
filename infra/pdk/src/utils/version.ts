/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Version management utilities
 */

import { execa } from 'execa';
import semver from 'semver';
import inquirer from 'inquirer';

import { logger } from './logger';

/**
 * Generates canary version with format: {version}-canary-{commitHash}-{timestamp}
 */
export async function generateCanaryVersion(
  currentVersion: string,
  cwd: string,
): Promise<{ version: string; tag: string }> {
  // Get current commit hash (short)
  const { stdout: commitHash } = await execa(
    'git',
    ['rev-parse', '--short', 'HEAD'],
    { cwd },
  );

  // Generate timestamp
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS

  // Generate canary version
  const canaryVersion = `${currentVersion}-canary-${commitHash.trim()}-${timestamp}`;

  return {
    version: canaryVersion,
    tag: 'nightly',
  };
}

/**
 * Prompts user to select version and tag
 */
export async function selectVersionAndTag(
  currentVersion: string,
  options?: {
    version?: string;
    tag?: string;
  },
): Promise<{ version: string; tag: string }> {
  // If version and tag are provided directly, skip prompts
  if (options?.version && options?.tag) {
    // Validate provided version
    if (!semver.valid(options.version)) {
      throw new Error(`Invalid version: ${options.version}`);
    }
    return {
      version: options.version,
      tag: options.tag,
    };
  }

  const customItem = { name: 'Custom', value: 'custom' };
  const bumps = ['patch', 'minor', 'major'] as const;

  const versions = {
    patch: semver.inc(currentVersion, 'patch') || '',
    minor: semver.inc(currentVersion, 'minor') || '',
    major: semver.inc(currentVersion, 'major') || '',
  };

  // Generate improved prerelease options
  const prereleaseVersions = [
    { name: `beta (${semver.inc(currentVersion, 'prerelease', 'beta')})`, value: 'beta' },
    { name: `alpha (${semver.inc(currentVersion, 'prerelease', 'alpha')})`, value: 'alpha' },
    { name: `rc (${semver.inc(currentVersion, 'prerelease', 'rc')})`, value: 'rc' },
  ];

  const bumpChoices = [
    { name: `patch (${versions.patch})`, value: 'patch' },
    { name: `minor (${versions.minor})`, value: 'minor' },
    { name: `major (${versions.major})`, value: 'major' },
  ];

  const getNpmTags = (version: string) => {
    if (semver.prerelease(version)) {
      const prerelease = semver.prerelease(version);
      const prereleaseType = prerelease?.[0] as string;
      
      // Return appropriate tags based on prerelease type
      if (prereleaseType === 'beta') return ['beta', 'latest', customItem];
      if (prereleaseType === 'alpha') return ['alpha', 'latest', customItem];
      if (prereleaseType === 'rc') return ['rc', 'latest', customItem];
      
      return ['latest', 'beta', 'alpha', 'rc', customItem];
    }
    return ['latest', 'beta', 'alpha', 'rc', customItem];
  };

  const { bump, customVersion, npmTag, customNpmTag } = await inquirer.prompt([
    {
      name: 'bump',
      message: 'Select release type:',
      type: 'list',
      choices: [...bumpChoices, ...prereleaseVersions, customItem],
    },
    {
      name: 'customVersion',
      message: 'Input version:',
      type: 'input',
      when: (answers) => answers.bump === 'custom',
      validate: (input) =>
        semver.valid(input) ? true : 'Please enter a valid semver version',
    },
    {
      name: 'npmTag',
      message: 'Select npm tag:',
      type: 'list',
      choices: (answers) => {
        const version = (answers.bump === 'beta' || answers.bump === 'alpha' || answers.bump === 'rc')
          ? semver.inc(currentVersion, 'prerelease', answers.bump)
          : answers.customVersion || versions[answers.bump];
        return getNpmTags(version);
      },
    },
    {
      name: 'customNpmTag',
      message: 'Input customized npm tag:',
      type: 'input',
      when: (answers) => answers.npmTag === 'custom',
    },
  ]);

  let version: string;
  if (bump === 'beta' || bump === 'alpha' || bump === 'rc') {
    version = semver.inc(currentVersion, 'prerelease', bump) || '';
  } else {
    version = customVersion || versions[bump];
  }
  
  const tag = customNpmTag || npmTag;

  return { version, tag };
}

/**
 * Updates package version in package.json
 */
export async function updatePackageVersion(
  packagePath: string,
  version: string,
  dryRun = false,
): Promise<void> {
  if (dryRun) {
    logger.info(`[dry-run] Would update version in ${packagePath} to ${version}`);
    return;
  }

  const { readJsonSync, writeJsonSync } = await import('fs-extra');
  const packageJson = readJsonSync(packagePath);
  packageJson.version = version;
  writeJsonSync(packagePath, packageJson, { spaces: 2 });
}

/**
 * Get next version options for current version
 */
export function getNextVersionOptions(currentVersion: string): Record<string, string> {
  const versions = {
    patch: semver.inc(currentVersion, 'patch') || '',
    minor: semver.inc(currentVersion, 'minor') || '',
    major: semver.inc(currentVersion, 'major') || '',
    prerelease: semver.inc(currentVersion, 'prerelease') || '',
  };

  // Add prerelease variants
  versions['prerelease-beta'] = semver.inc(currentVersion, 'prerelease', 'beta') || '';
  versions['prerelease-alpha'] = semver.inc(currentVersion, 'prerelease', 'alpha') || '';
  versions['prerelease-rc'] = semver.inc(currentVersion, 'prerelease', 'rc') || '';

  return versions;
}