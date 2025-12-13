/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interactive confirmation utilities
 */

import { rawlist } from '@inquirer/prompts';
import chalk from 'chalk';
import { logger } from './logger.js';
import type { WorkspacePackage } from '../types.js';

/**
 * Confirms release version and tag
 */
export async function confirmRelease(
  version: string,
  tag: string,
): Promise<boolean> {
  const yes = await rawlist({
    message: `Confirm releasing ${version} (${tag})?`,
    choices: ['N', 'Y'],
  });

  if (yes === 'N') {
    logger.info('Release cancelled.');
    return false;
  }

  return true;
}

/**
 * Confirms packages to publish
 */
export async function confirmPackagesToPublish(
  packagesToPublish: WorkspacePackage[],
  canary = false,
): Promise<boolean> {
  console.log(chalk.bold('\nPackages to be published:'));
  packagesToPublish.forEach((pkg) => {
    console.log(`  - ${chalk.cyan(pkg.name)} (${chalk.gray(pkg.dir)})`);
  });
  console.log();

  if (canary) {
    return true; // Skip confirmation in canary mode
  }

  const confirmPublish = await rawlist({
    message: 'Are these the correct packages to publish?',
    choices: ['Y', 'N'],
  });

  if (confirmPublish === 'N') {
    logger.info('Publication cancelled.');
    return false;
  }

  return true;
}

/**
 * Confirms git tag push
 */
export async function confirmTagPush(
  tagName: string,
  canary = false,
): Promise<boolean> {
  if (canary) {
    return true; // Auto-push in canary mode
  }

  const pushToRemote = await rawlist({
    message: `Push tag ${tagName} to remote repository?`,
    choices: ['Yes', 'No'],
  });

  return pushToRemote === 'Yes';
}
