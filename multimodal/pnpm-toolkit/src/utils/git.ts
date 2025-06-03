/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Git utilities for PTK
 */
import * as execa from 'execa';
import type { CommitAuthor } from '../types';

/**
 * Pushes changes to remote
 */
export async function gitPush(cwd = process.cwd()): Promise<void> {
  await execa.execa('git', ['push'], { cwd, stdio: 'inherit' });
}

/**
 * Pushes a tag to remote
 */
export async function gitPushTag(
  tag: string,
  pushCommit = true,
  cwd = process.cwd(),
): Promise<boolean> {
  // Push tag
  await execa.execa('git', ['push', 'origin', tag], { cwd, stdio: 'inherit' });

  // Also push the commit if requested
  if (pushCommit) {
    await execa.execa('git', ['push'], { cwd, stdio: 'inherit' });
  }

  return true;
}

/**
 * Creates a git commit
 */
export async function gitCommit(message: string, cwd = process.cwd()): Promise<void> {
  await execa.execa('git', ['add', '-A'], { cwd, stdio: 'inherit' });
  await execa.execa('git', ['commit', '-m', message], { cwd, stdio: 'inherit' });
}

/**
 * Creates a git tag
 */
export async function gitCreateTag(
  tagName: string,
  message: string,
  cwd = process.cwd(),
): Promise<void> {
  await execa.execa('git', ['tag', '-a', tagName, '-m', message], { cwd, stdio: 'inherit' });
}

/**
 * Gets author information for a commit
 */
export function getCommitAuthor(hash: string, cwd = process.cwd()): CommitAuthor {
  try {
    const result = execa.execaSync('git', ['--no-pager', 'show', '-s', '--pretty=%an,%ae', hash], {
      cwd,
    });
    const [name, email] = result.stdout.split(',');
    const emailName = email.slice(0, email.indexOf('@'));

    return { name, email, emailName };
  } catch (err) {
    return { name: 'N/A', email: 'N/A', emailName: 'N/A' };
  }
}

/**
 * Gets a map of commit hashes to authors
 */
export function getCommitAuthorMap(cwd = process.cwd()): Record<string, CommitAuthor> {
  try {
    const result = execa.execaSync('git', ['--no-pager', 'log', '--pretty=%h,%an,%ae'], { cwd });

    return result.stdout.split('\n').reduce<Record<string, CommitAuthor>>((map, line) => {
      const [hash, name, email] = line.split(',');
      const emailName = email ? email.slice(0, email.indexOf('@')) : 'N/A';

      map[hash.slice(0, 7)] = {
        name: name?.replace(/\s/g, '&nbsp;') || 'N/A',
        email: email || 'N/A',
        emailName: emailName || 'N/A',
      };

      return map;
    }, {});
  } catch (err) {
    return {};
  }
}
