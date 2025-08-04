/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '@tarko/shared-utils';
import os from 'os';

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

  if (absolutePath.startsWith(homedir)) {
    return absolutePath.replace(homedir, '~');
  }

  return absolutePath;
}
