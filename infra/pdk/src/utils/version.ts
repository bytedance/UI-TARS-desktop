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
): Promise<{ version: string; tag: string }> {
  const customItem = { name: 'Custom', value: 'custom' };
  const bumps = ['patch', 'minor', 'major', 'prerelease', 'premajor'] as const;

  const versions = bumps.reduce<Record<string, string>>((acc, bump) => {
    acc[bump] = semver.inc(currentVersion, bump) || '';
    return acc;
  }, {});

  const bumpChoices = bumps.map((bump) => ({
    name: `${bump} (${versions[bump]})`,
    value: bump,
  }));

  const getNpmTags = (version: string) => {
    if (semver.prerelease(version)) {
      return ['next', 'latest', 'beta', customItem];
    }
    return ['latest', 'next', 'beta', customItem];
  };

  const { bump, customVersion, npmTag, customNpmTag } = await inquirer.prompt([
    {
      name: 'bump',
      message: 'Select release type:',
      type: 'list',
      choices: [...bumpChoices, customItem],
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
      message: 'Input npm tag:',
      type: 'list',
      choices: (answers) =>
        getNpmTags(answers.customVersion || versions[answers.bump]),
    },
    {
      name: 'customNpmTag',
      message: 'Input customized npm tag:',
      type: 'input',
      when: (answers) => answers.npmTag === 'custom',
    },
  ]);

  const version = customVersion || versions[bump];
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