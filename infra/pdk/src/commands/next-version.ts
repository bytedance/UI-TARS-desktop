/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Next version command implementation
 * Shows next version options based on current version
 */

import { resolveWorkspaceConfig } from '../utils/workspace';
import { logger } from '../utils/logger';
import { getNextVersionOptions } from '../utils/version';

import type { CommonOptions } from '../types';

/**
 * Next version command implementation
 */
export async function nextVersion(options: CommonOptions = {}): Promise<void> {
  const { cwd = process.cwd() } = options;

  try {
    // Get workspace configuration
    const config = resolveWorkspaceConfig(cwd);
    const currentVersion = config.rootPackageJson.version || '0.0.0';

    logger.info(`Current version: ${currentVersion}`);
    console.log();

    // Get all next version options
    const nextVersions = getNextVersionOptions(currentVersion);

    console.log('Next version options:');
    console.log();

    // Display standard versions
    const standardVersions = ['patch', 'minor', 'major', 'prerelease'];
    standardVersions.forEach((type) => {
      const version = nextVersions[type];
      if (version) {
        console.log(`  ${type.padEnd(12)} ${version}`);
      }
    });

    console.log();

    // Display prerelease variants
    console.log('Prerelease variants:');
    const prereleaseTypes = ['beta', 'alpha', 'rc'];
    prereleaseTypes.forEach((type) => {
      const version = nextVersions[`prerelease-${type}`];
      if (version) {
        console.log(`  ${type.padEnd(12)} ${version}`);
      }
    });

    console.log();

    // Display usage examples
    console.log('Usage examples:');
    console.log(`  pdk release --release-version ${nextVersions.patch} --release-tag latest`);
    console.log(`  pdk release --release-version ${nextVersions['prerelease-beta']} --release-tag beta`);
    console.log(`  pdk release --release-version ${nextVersions.minor} --release-tag latest`);
  } catch (err) {
    logger.error(`Failed to get next version options: ${(err as Error).message}`);
    throw err;
  }
}