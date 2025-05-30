/**
 * MIT License
 * Copyright (c) 2024 RPate97
 * https://github.com/token-js/token.js/blob/main/LICENSE
 */

/**
 * Patch command implementation
 * Fixes failed package publishing
 */
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs-extra';
import inquirer from 'inquirer';
import textTable from 'text-table';
import stringWidth from 'string-width';
import chalk from 'chalk';

import { loadWorkspacePackages, resolveWorkspaceConfig } from '../utils/workspace';
import { fetchPackageVersion } from '../utils/npm';
import { logger } from '../utils/logger';
import { publishPackage } from '../utils/npm';
import { removeGitHeadField } from '../utils/npm';

import type { PatchOptions, PackageWithRemoteInfo } from '../types';

/**
 * Formats the release status table
 */
function formatReleaseStatusTable(
  packages: PackageWithRemoteInfo[],
  targetVersion: string,
  tag: string,
): string {
  const table = packages.map((pkg) => {
    if (pkg.remoteVersion === targetVersion) {
      return [pkg.name, pkg.version, 'Yes', '-'].map((v) => chalk.dim(v));
    }

    return [
      chalk.bold(chalk.red(pkg.name)),
      chalk.bold(chalk.red(pkg.remoteVersion)),
      chalk.bold(chalk.red('NO')),
      chalk.bold(chalk.red(targetVersion)),
    ];
  });

  table.unshift(
    ['Package Name', `Remote Version (tag: ${tag})`, 'Published', 'Expected Version'].map((v) =>
      chalk.dim(v),
    ),
  );

  return textTable(table, { stringLength: stringWidth });
}

/**
 * Removes gitHead field from package.json
 */
function cleanGitHead(packagePath: string): void {
  const content = readFileSync(packagePath, 'utf-8');
  writeFileSync(packagePath, removeGitHeadField(content), 'utf-8');
}

/**
 * Patch command implementation
 */
export async function patch(options: PatchOptions = {}): Promise<void> {
  const { cwd = process.cwd(), runInBand = false, ignoreScripts = false } = options;

  let { version, tag } = options;

  logger.info('Patch Started');

  if (!tag) {
    throw new Error('"tag" is required for patch operation');
  }

  // If version not provided, try to get from config
  if (!version) {
    const config = resolveWorkspaceConfig(cwd);
    version = config.rootPackageJson.version;
  }

  if (!version) {
    throw new Error('"version" is required for patch operation');
  }

  logger.info(`Version: ${chalk.cyan(version)}`);
  logger.info(`Tag: ${chalk.cyan(tag)}`);

  // Load workspace packages
  const packages = await loadWorkspacePackages(cwd);

  // Clean gitHead field from all package.json files
  packages.forEach((pkg) => {
    cleanGitHead(join(pkg.dir, 'package.json'));
  });

  // Get remote versions for all packages
  const packagesWithRemote: PackageWithRemoteInfo[] = await Promise.all(
    packages
      .filter((pkg) => !pkg.isPrivate)
      .map(async (pkg) => ({
        ...pkg,
        remoteVersion: await fetchPackageVersion(pkg.name, tag),
      })),
  );

  // Check if all packages are published correctly
  if (packagesWithRemote.every((pkg) => pkg.remoteVersion === version)) {
    logger.success('All packages have been published correctly!');
    return;
  }

  // Show release status table
  console.log(formatReleaseStatusTable(packagesWithRemote, version, tag));
  console.log();

  // Confirm patch operation
  const { confirm } = await inquirer.prompt([
    {
      name: 'confirm',
      message: 'Continue to patch?',
      type: 'list',
      choices: ['No', 'Yes'],
    },
  ]);

  if (confirm !== 'Yes') {
    logger.info('Patch cancelled.');
    return;
  }

  // Find packages that need patching
  const packagesToPatch = packagesWithRemote.filter((pkg) => pkg.remoteVersion !== version);

  // Publish packages
  if (runInBand) {
    for (const pkg of packagesToPatch) {
      logger.info(`Publishing ${pkg.name}...`);
      await publishPackage(pkg.dir, tag, ignoreScripts);
      logger.success(`Published ${pkg.name}@${version}`);
    }
  } else {
    await Promise.all(
      packagesToPatch.map(async (pkg) => {
        logger.info(`Publishing ${pkg.name}...`);
        await publishPackage(pkg.dir, tag, ignoreScripts);
        logger.success(`Published ${pkg.name}@${version}`);
      }),
    );
  }

  logger.success('Patch completed!');
}
