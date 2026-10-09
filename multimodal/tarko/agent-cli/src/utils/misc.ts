/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '@tarko/shared-utils';
import os from 'os';
import path from 'path';

// Export logger for use throughout the application
export const logger = getLogger('AgentCLI');

/**
 * Resolve API key or URL for command line options
 */
export function resolveValue(value: string | undefined, label = 'value'): string | undefined {
  if (!value) return undefined;

  // If value is in all uppercase, treat it as an environment variable
  if (/^[A-Z][A-Z0-9_]*$/.test(value)) {
    const envValue = process.env[value];
    if (envValue) {
      logger.debug(`Using ${label} from environment variable: ${value}`);
      return envValue;
    } else {
      logger.warn(`Environment variable "${value}" not found, using as literal value`);
    }
  }

  return value;
}

/**
 * Converts an absolute path to a user-friendly path with ~ for home directory
 */
export function toUserFriendlyPath(absolutePath: string): string {
  const homedir = os.homedir();

  if (absolutePath === homedir) {
    return '~';
  }

  // Requiring a separator after the home directory keeps a sibling whose name extends
  // it out of the rewrite: `/home/user2/project` is not under `/home/user`.
  const insideHome =
    absolutePath.startsWith(homedir) &&
    (homedir.endsWith(path.sep) || absolutePath[homedir.length] === path.sep);

  return insideHome ? absolutePath.replace(homedir, '~') : absolutePath;
}
