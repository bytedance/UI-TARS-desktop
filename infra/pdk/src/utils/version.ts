/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Version management utilities
 */

import { readJsonSync, writeJsonSync } from '../utils/json.js';
import { execa } from 'execa';
import semver from 'semver';
import { input, rawlist } from '@inquirer/prompts';
import { logger } from './logger.js';

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

const CUSTOM = { name: 'Custom', value: 'custom' };
const NEXT = { name: 'Next', value: 'next' };
const BETA = { name: 'Beta', value: 'beta' };
const LATEST = { name: 'Latest', value: 'latest' };

/**
 * Prompts user to select version and tag
 */
export async function selectVersionAndTag(
  currentVersion: string,
): Promise<{ version: string; tag: string }> {
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
      return [NEXT, LATEST, BETA, CUSTOM];
    }
    return [LATEST, NEXT, BETA, CUSTOM];
  };

  const bump = await rawlist({
    message: 'Select release type:',
    choices: [...bumpChoices, CUSTOM],
  });

  let customVersion: string | undefined;
  if (bump === 'custom') {
    customVersion = await input({
      message: 'Input version:',
      validate: (input) =>
        semver.valid(input) ? true : 'Please enter a valid semver version',
    });
  }

  const npmTag = await rawlist({
    message: 'Input npm tag:',
    choices: getNpmTags(customVersion || versions[bump]),
  });

  const customNpmTag = npmTag === 'custom'
    ? await input({ message: 'Input customized npm tag:' })
    : undefined;

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

  const packageJson = readJsonSync(packagePath);
  packageJson.version = version;
  writeJsonSync(packagePath, packageJson);
}