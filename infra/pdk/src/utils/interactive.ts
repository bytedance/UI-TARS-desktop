/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interactive confirmation utilities
 */

import inquirer from 'inquirer';
import chalk from 'chalk';

import { logger } from './logger';
import type { WorkspacePackage } from '../types';

/**
 * Confirms release version and tag
 */
export async function confirmRelease(
  version: string,
  tag: string,
): Promise<boolean> {
  const { yes } = await inquirer.prompt([
    {
      name: 'yes',
      message: `Confirm releasing ${version} (${tag})?`,
      type: 'list',
      choices: ['N', 'Y'],
    },
  ]);

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

  const { confirmPublish } = await inquirer.prompt([
    {
      name: 'confirmPublish',
      message: 'Are these the correct packages to publish?',
      type: 'list',
      choices: ['Y', 'N'],
    },
  ]);

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

  const { pushToRemote } = await inquirer.prompt([
    {
      name: 'pushToRemote',
      message: `Push tag ${tagName} to remote repository?`,
      type: 'list',
      choices: ['Yes', 'No'],
    },
  ]);

  return pushToRemote === 'Yes';
}
