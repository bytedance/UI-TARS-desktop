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
  const bumps = ['patch', 'minor', 'major', 'prerelease'] as const;

  const versions = bumps.reduce<Record<string, string>>((acc, bump) => {
    acc[bump] = semver.inc(currentVersion, bump) || '';
    return acc;
  }, {});

  // Generate improved prerelease options
  const prereleaseVersions = [
    { name: `beta (${semver.inc(currentVersion, 'prerelease', 'beta')})`, value: 'beta' },
    { name: `alpha (${semver.inc(currentVersion, 'prerelease', 'alpha')})`, value: 'alpha' },
    { name: `rc (${semver.inc(currentVersion, 'prerelease', 'rc')})`, value: 'rc' },
    { name: `next (${semver.inc(currentVersion, 'prerelease', 'next')})`, value: 'next' },
    { name: `dev (${semver.inc(currentVersion, 'prerelease', 'dev')})`, value: 'dev' },
  ];

  const bumpChoices = bumps
    .filter(bump => bump !== 'prerelease')
    .map((bump) => ({
      name: `${bump} (${versions[bump]})`,
      value: bump,
    }));

  const getNpmTags = (version: string) => {
    if (semver.prerelease(version)) {
      const prerelease = semver.prerelease(version);
      const prereleaseType = prerelease?.[0] as string;
      
      // Return appropriate tags based on prerelease type
      if (prereleaseType === 'beta') return ['beta', 'next', 'latest', customItem];
      if (prereleaseType === 'alpha') return ['alpha', 'next', 'latest', customItem];
      if (prereleaseType === 'rc') return ['rc', 'next', 'latest', customItem];
      if (prereleaseType === 'next') return ['next', 'latest', customItem];
      if (prereleaseType === 'dev') return ['dev', 'next', 'latest', customItem];
      
      return ['next', 'latest', 'beta', 'alpha', 'rc', 'dev', customItem];
    }
    return ['latest', 'next', 'beta', 'alpha', 'rc', 'dev', customItem];
  };

  const { bump, customVersion, prereleaseType, npmTag, customNpmTag } = await inquirer.prompt([
    {
      name: 'bump',
      message: 'Select release type:',
      type: 'list',
      choices: [...bumpChoices, { name: 'Prerelease', value: 'prerelease' }, customItem],
    },
    {
      name: 'prereleaseType',
      message: 'Select prerelease type:',
      type: 'list',
      choices: prereleaseVersions,
      when: (answers) => answers.bump === 'prerelease',
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
        const version = answers.prereleaseType 
          ? semver.inc(currentVersion, 'prerelease', answers.prereleaseType)
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
  if (bump === 'prerelease') {
    version = semver.inc(currentVersion, 'prerelease', prereleaseType) || '';
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
  const bumps = ['patch', 'minor', 'major', 'prerelease'] as const;
  
  const versions = bumps.reduce<Record<string, string>>((acc, bump) => {
    acc[bump] = semver.inc(currentVersion, bump) || '';
    return acc;
  }, {});

  // Add prerelease variants
  versions['prerelease-beta'] = semver.inc(currentVersion, 'prerelease', 'beta') || '';
  versions['prerelease-alpha'] = semver.inc(currentVersion, 'prerelease', 'alpha') || '';
  versions['prerelease-rc'] = semver.inc(currentVersion, 'prerelease', 'rc') || '';
  versions['prerelease-next'] = semver.inc(currentVersion, 'prerelease', 'next') || '';
  versions['prerelease-dev'] = semver.inc(currentVersion, 'prerelease', 'dev') || '';

  return versions;
}