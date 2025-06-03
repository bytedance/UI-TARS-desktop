/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * NPM utilities for PTK
 */
import * as execa from 'execa';

/**
 * Fetches package version from npm registry
 */
export async function fetchPackageVersion(name: string, tag: string): Promise<string> {
  try {
    const result = await execa.execa('npm', ['view', `${name}@${tag}`, 'version']);
    return result.stdout.toString();
  } catch (err) {
    return '- (1st release)';
  }
}

/**
 * Publishes a package to npm
 */
export async function publishPackage(
  packageDir: string,
  tag: string,
  ignoreScripts = false,
  dryRun = false,
): Promise<void> {
  const args = ['publish', '--tag', tag];

  if (ignoreScripts) {
    args.push('--ignore-scripts');
  }

  if (dryRun) {
    console.log(`[dry-run] npm ${args.join(' ')} in ${packageDir}`);
    return;
  }

  await execa.execa('npm', args, {
    cwd: packageDir,
    stdio: 'inherit',
  });
}

/**
 * Removes gitHead field from package.json
 * This is to prevent npm publish from failing due to duplicate gitHead
 */
export function removeGitHeadField(packageJsonContent: string): string {
  const GIT_HEAD_REG = /,[\n\t\s]*"gitHead":\s"[^"]+"/;
  return packageJsonContent.replace(GIT_HEAD_REG, '');
}